if (https == null) {
    var https = require('https');
}

if (URL == null) {
    var URL = require('url').URL;
}

function getAccessToken(authorization, callback) {
    const options = {
        hostname: 'bitbucket.org',
        path: '/site/oauth2/access_token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': authorization
        }
    };
    const req = https.request(options, res => {
        res.setEncoding('utf8');
        let data = '';
        res.on('data', chunk => {
            data += chunk;
        });
        res.on('end', () => {
            const jsonData = JSON.parse(data);

            if (jsonData.access_token) {
                callback(jsonData.access_token);
                return;
            }

            throw jsonData.error;
        });
    });
    req.on('error', error => {
        console.error(error);
    });
    req.write('grant_type=client_credentials');
    req.end();
}

function getBaseApiUrl(account, repository) {
    return `/2.0/repositories/${account}/${repository}/pullrequests`;
}

function median(values) {
    if (values.length === 0) return 0;

    values.sort(function(a, b) {
        return a - b;
    });

    var half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half];

    return (values[half - 1] + values[half]) / 2.0;
}

function getPullRequestUrlWithQuery(account, repository, sinceDate, untilDate) {
    const sinceDateString = sinceDate.getFullYear() + '-' + (parseInt(sinceDate.getMonth()) + 1) + '-' + sinceDate.getDate();
    const untilDateString = untilDate.getFullYear() + '-' + (parseInt(untilDate.getMonth()) + 1) + '-' + untilDate.getDate();

    const dateFilter = `updated_on>"${sinceDateString}"%20AND%20updated_on<"${untilDateString}"`;
    const path = `${getBaseApiUrl(account, repository)}?q=${dateFilter}`;

    return path;
}

function getPullRequests(accessToken, account, repository, sinceDate, untilDate, nextPage, callback) {
    let path = getPullRequestUrlWithQuery(account, repository, sinceDate, untilDate);
    if (nextPage) {
        const urlObject = new URL(nextPage);
        path = urlObject.pathname + (urlObject.searchParams ? '?' + urlObject.searchParams : '');
    }

    const options = {
        hostname: 'api.bitbucket.org',
        path: path,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    };
    const req = https.request(options, res => {
        res.setEncoding('utf8');
        let data = '';
        res.on('data', chunk => {
            data += chunk;
        });
        res.on('end', () => {
            callback(JSON.parse(data));
        });
    });
    req.on('error', error => {
        console.error(error);
    });
    req.end();
}

function getPullRequestActivities(account, repository, accessToken, pullRequestId, nextPage, callback) {
    let path = `${getBaseApiUrl(account, repository)}/${pullRequestId}/activity`;
    if (nextPage) {
        const urlObject = new URL(nextPage);
        path = urlObject.pathname + (urlObject.searchParams ? '?' + urlObject.searchParams : '');
    }

    const options = {
        hostname: 'api.bitbucket.org',
        path: path,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    };
    const req = https.request(options, res => {
        res.setEncoding('utf8');
        let data = '';
        res.on('data', chunk => {
            data += chunk;
        });
        res.on('end', () => {
            callback(JSON.parse(data));
        });
    });
    req.on('error', error => {
        console.error(error);
    });
    req.end();
}

function getPullRequestFullActivities(account, repository, accessToken, pullRequestId, page, allActivities, isLastPullRequest, callback) {
    getPullRequestActivities(account, repository, accessToken, pullRequestId, page, response => {
        allActivities = allActivities.concat(response.values);
        if (response.next) {
            getPullRequestFullActivities(account, repository, accessToken, pullRequestId, response.next, allActivities, isLastPullRequest, callback);
        } else {
            callback(allActivities, isLastPullRequest);
        }
    });
}

function getAllPullRequests(accessToken, account, repository, sinceDate, untilDate, page, allPullRequests, callback) {
    getPullRequests(accessToken, account, repository, sinceDate, untilDate, page, response => {
        allPullRequests = allPullRequests.concat(response.values);
        if (response.next) {
            getAllPullRequests(accessToken, account, repository, sinceDate, untilDate, response.next, allPullRequests, callback);
        } else {
            callback(allPullRequests);
        }
    });
}

function getReport(authorization, account, repository, sinceDate, untilDate, callback) {
    getAccessToken(authorization, accessToken => {
        getAllPullRequests(accessToken, account, repository, sinceDate, untilDate, null, [], (pullRequests) => {
            let prCount = 0; // counter used to check when last pr is reached to execute the rate calculation
            let hoursDifferencesList = [];
            let prDetails = [];
    
            for (const pullRequest of pullRequests) {
                prCount++;
    
                if (!pullRequest)
                    continue;
    
                if (pullRequest.title.toLowerCase().includes('DNM') ||
                    pullRequest.title.toLowerCase().includes('donotmerge') ||
                    pullRequest.title.toLowerCase().includes('do not merge')) {
                    continue;
                }
    
                const isLastPullRequest = prCount == pullRequests.length;
    
                getPullRequestFullActivities(account, repository, accessToken, pullRequest.id, null, [], isLastPullRequest, (fullActivities, executeCalcul) => {
                    const comments = fullActivities.filter(activity => activity.comment).map(activity => activity.comment.created_on);
                    const approvals = fullActivities.filter(activity => activity.approval).map(activity => activity.approval.date);
                    const changesRequests = fullActivities.filter(activity => activity.changes_requested).map(activity => activity.changes_requested.date);
    
                    const allActivities = comments.concat(approvals).concat(changesRequests).sort((a, b) => new Date(a) - new Date(b));
    
                    if (allActivities && allActivities.length) {
                        const firstActivityDate = new Date(allActivities[0]);
                        const prCreatedDate = new Date(pullRequest.created_on);
                        const hourDifference = Math.round(Math.abs(firstActivityDate - prCreatedDate) / 1000 / 3600);
                        hoursDifferencesList.push(hourDifference);
    
                        prDetails.push({
                            id: pullRequest.id,
                            created_date: prCreatedDate,
                            first_activity_date: firstActivityDate,
                            response_time: hourDifference
                        });
    
                        // if it's the last Pull request, start the calculation
                        if (executeCalcul) {
                            const sum = hoursDifferencesList.reduce((a, b) => a + b, 0);
                            const avg = (sum / hoursDifferencesList.length) || 0;
    
                            callback({
                                checked_week: sinceDate,
                                number_of_pull_requests: hoursDifferencesList.length,
                                average_response_time: avg,
                                median_response_time: median(hoursDifferencesList),
                                details: prDetails
                            });
                        }
                    }
                });
            }
        });
    });
}

module.exports = {
    getReport: getReport
};