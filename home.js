const urlParams = new URLSearchParams(window.location.search);
const repositories = localStorage.getItem('bitbucket_repositories').split(',');
const current_repo = urlParams.get('repo') || localStorage.getItem('current_repo') || repositories[0];
const accountid = localStorage.getItem('bitbucket_accountid');
const access_token = localStorage.getItem('bitbucket_access_token');
const legitReviewers = [
    "NGUYEN",
    "PASQUET",
    "MARTINA"
];

function getBaseApiUrl(repository) {
    return 'https://bitbucket.org/api/2.0/repositories/' + accountid + '/' + repository + '/pullrequests';
}

function getUrlWithQuery(repository, query) {
    return getBaseApiUrl(repository) + '?q=' + query;
}

function countPullRequests(url, counterId) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.setRequestHeader('Authorization', 'Bearer ' + access_token);
    request.onreadystatechange = function() {
        if (this.readyState != 4) return;

        if (this.status == 200) {
            var data = JSON.parse(this.responseText);
            var pull_requests = data.values;
            pull_requests.forEach(pr => {
                var newValue = parseInt(document.getElementById(counterId).innerHTML || 0) + 1;
                document.getElementById(counterId).innerHTML = newValue;
                localStorage.setItem(counterId, newValue);
            })

            if (data.next) {
                countPullRequests(data.next, counterId);
            }
        }
    };
    request.send();
}

function countPullRequestSince(repository, status, datetime, counterId) {
    var dateString = datetime.getFullYear() + '-' + (parseInt(datetime.getMonth()) + 1) + '-' + datetime.getDate();
    var query = 'updated_on>"' + dateString + '" and state="' + status + '"';
    var url = getUrlWithQuery(repository, query);

    countPullRequests(url, counterId);
}

function countLastWeekMergedPullRequests(repository, isLocal) {
    var counterId = 'pullrequest_status_merged_week';

    if (isLocal) {
        var storedValue = localStorage.getItem(counterId);

        if (storedValue) {
            document.getElementById(counterId).innerHTML = storedValue;
            return;
        }
    }

    var today = new Date();
    var oneWeekAgo = new Date(today.setDate(today.getDate() - 7));

    countPullRequestSince(repository, 'MERGED', oneWeekAgo, counterId)
}

function countLastMonthMergedPullRequests(repository, isLocal) {
    var counterId = 'pullrequest_status_merged_month';

    if (isLocal) {
        var storedValue = localStorage.getItem(counterId);

        if (storedValue) {
            document.getElementById(counterId).innerHTML = storedValue;
            return;
        }
    }

    var today = new Date();
    var oneMonthAgo = new Date(today.setDate(today.getDate() - 30));

    countPullRequestSince(repository, 'MERGED', oneMonthAgo, 'pullrequest_status_merged_month')
}

function countOpenPullRequest(repository, isLocal) {
    var counterId = 'pullrequest_status_open';

    if (isLocal) {
        var storedValue = localStorage.getItem(counterId);

        if (storedValue) {
            document.getElementById(counterId).innerHTML = storedValue;
            return;
        }
    }

    var open_status = 'OPEN';
    var query = 'state="' + open_status + '"';
    var url = getUrlWithQuery(repository, query);

    countPullRequests(url, counterId);
}

function countAverageTimeToMerge(url, counterId) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.setRequestHeader('Authorization', 'Bearer ' + access_token);
    request.onreadystatechange = function() {
        if (this.readyState != 4) return;

        if (this.status == 200) {
            var data = JSON.parse(this.responseText);
            var pull_requests = data.values;

            pull_requests.forEach(pr => {
                var createdDate = new Date(pr.created_on);
                var mergedDate = new Date(pr.updated_on);
                var hourDifference = Math.round(Math.abs(mergedDate - createdDate) / 1000 / 3600);

                if (!document.getElementById(counterId).dataset.hourDifferences)
                    document.getElementById(counterId).dataset.hourDifferences = hourDifference;
                else
                    document.getElementById(counterId).dataset.hourDifferences += ',' + hourDifference;
            })

            if (data.next) {
                countAverageTimeToMerge(data.next, counterId);
            } else {
                var hoursArray = document.getElementById(counterId).dataset.hourDifferences.split(',').map(function(x) {
                    return parseInt(x, 10)
                })
                var hourMedian = Math.round(median(hoursArray));
                var avgDaysMerge = Math.round(hourMedian / 24);

                var newValue;

                if (hourMedian < 24)
                    newValue = 'less than 1 day (' + hourMedian + 'h)';
				else if (hourMedian == 24)
					newValue = '1 day (' + hourMedian + 'h)';
                else
                    newValue = '~' + avgDaysMerge + ' days (' + hourMedian + 'h)';

                document.getElementById(counterId).innerHTML = newValue;

                localStorage.setItem(counterId, newValue);
            }
        }
    };
    request.send();
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

function requestComments(url, pullRequestCreatedTime, counterId) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.setRequestHeader('Authorization', 'Bearer ' + access_token);
    request.onreadystatechange = function() {
        if (this.readyState != 4) return;

        if (this.status == 200) {
            var data = JSON.parse(this.responseText);
            var comments = data.values;
			var firstCommentReaded = false;

            for (var i = 0; i < comments.length; i++) {
                if (!firstCommentReaded && legitReviewers.some(r => comments[i].user.nickname.includes(r))) {
                    var commentCreatedDate = new Date(comments[i].created_on);
                    var prCreatedDate = new Date(pullRequestCreatedTime);
                    var hourDifference = Math.round(Math.abs(commentCreatedDate - prCreatedDate) / 1000 / 3600);

                    if (!document.getElementById(counterId).dataset.hourDifferences)
                        document.getElementById(counterId).dataset.hourDifferences = hourDifference;
                    else
                        document.getElementById(counterId).dataset.hourDifferences += ',' + hourDifference;
						
					firstCommentReaded = true;
                }
            }

            if (data.next) {
                requestComments(data.next, pullRequestCreatedTime, counterId);
            } else {
                if (document.getElementById(counterId).dataset.hourDifferences) {
                    var hoursArray = document.getElementById(counterId).dataset.hourDifferences.split(',').map(function(x) {
                        return parseInt(x, 10)
                    })
                    var hourMedian = Math.round(median(hoursArray));
                    var avgDaysMerge = Math.round(hourMedian / 24);

                    var newValue;

                    if (hourMedian < 24)
                        newValue = 'less than 1 day (' + hourMedian + 'h)';
                    else
                        newValue = '~' + avgDaysMerge + ' days (' + hourMedian + 'h)';

                    document.getElementById(counterId).innerHTML = newValue;

                    localStorage.setItem(counterId, newValue);
                }
            }
        }
    };
    request.send();
}

function countAverageTimeToFirstComment(repository, url, counterId) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.setRequestHeader('Authorization', 'Bearer ' + access_token);
    request.onreadystatechange = function() {
        if (this.readyState != 4) return;

        if (this.status == 200) {
            var data = JSON.parse(this.responseText);
            var pull_requests = data.values;

            for (var i = 0; i < pull_requests.length; i++) {
                var avgTimeToComment = document.getElementById(counterId).dataset.value || 0;
                requestComments(getBaseApiUrl(repository) + '/' + pull_requests[i].id + '/comments', pull_requests[i].created_on, counterId, avgTimeToComment);
            }
			
			if (data.next) {
                countAverageTimeToFirstComment(repository, data.next, counterId);
            }
        }
    };
    request.send();
}

//last week
function countLastWeekAverageTimeToReply(repository, isLocal) {
    var counterId = 'avg_time_reponse_week';

    if (isLocal) {
        var storedValue = localStorage.getItem(counterId);

        if (storedValue) {
            document.getElementById(counterId).innerHTML = storedValue;
            return;
        }
    }

    var today = new Date();
    var datetime = new Date(today.setDate(today.getDate() - 7));
    var dateString = datetime.getFullYear() + '-' + (parseInt(datetime.getMonth()) + 1) + '-' + datetime.getDate();
    var query = 'updated_on>"' + dateString + '"';
    var url = getUrlWithQuery(repository, query);

    countAverageTimeToFirstComment(repository, url, counterId);
}

function countLastMonthAverageTimeToReply(repository, isLocal) {
    var counterId = 'avg_time_reponse_month';

    if (isLocal) {
        var storedValue = localStorage.getItem(counterId);

        if (storedValue) {
            document.getElementById(counterId).innerHTML = storedValue;
            return;
        }
    }

    var today = new Date();
    var datetime = new Date(today.setDate(today.getDate() - 30));
    var dateString = datetime.getFullYear() + '-' + (parseInt(datetime.getMonth()) + 1) + '-' + datetime.getDate();
    var query = 'updated_on>"' + dateString + '"';
    var url = getUrlWithQuery(repository, query);

    countAverageTimeToFirstComment(repository, url, 'avg_time_reponse_month');
}

function countLastWeekAverageTimeToMerge(repository, isLocal) {
    var counterId = 'avg_time_merge_week';

    if (isLocal) {
        var storedValue = localStorage.getItem(counterId);

        if (storedValue) {
            document.getElementById(counterId).innerHTML = storedValue;
            return;
        }
    }

    var today = new Date();
    var datetime = new Date(today.setDate(today.getDate() - 7));
    var status = 'MERGED';
    var dateString = datetime.getFullYear() + '-' + (parseInt(datetime.getMonth()) + 1) + '-' + datetime.getDate();
    var query = 'updated_on>"' + dateString + '" and state="' + status + '"';
    var url = getUrlWithQuery(repository, query);

    countAverageTimeToMerge(url, counterId, 0);
}

function countLastMonthAverageTimeToMerge(repository, isLocal) {
    var counterId = 'avg_time_merge_month';

    if (isLocal) {
        var storedValue = localStorage.getItem(counterId);

        if (storedValue) {
            document.getElementById(counterId).innerHTML = storedValue;
            return;
        }
    }

    var today = new Date();
    var datetime = new Date(today.setDate(today.getDate() - 30));
    var status = 'MERGED';
    var dateString = datetime.getFullYear() + '-' + (parseInt(datetime.getMonth()) + 1) + '-' + datetime.getDate();
    var query = 'updated_on>"' + dateString + '" and state="' + status + '"';
    var url = getUrlWithQuery(repository, query);

    countAverageTimeToMerge(url, counterId, 0);
}

function countAverageNumber(repository, isLocal) {
    var counterId = 'avg_number_pr_week';

    if (isLocal) {
        var storedValue = localStorage.getItem(counterId);

        if (storedValue) {
            document.getElementById(counterId).innerHTML = storedValue;
            return;
        }
    }

    var today = new Date();
    var datetime = new Date(today.setDate(today.getDate() - 30));
    var dateString = datetime.getFullYear() + '-' + (parseInt(datetime.getMonth()) + 1) + '-' + datetime.getDate();
    var query = 'updated_on>"' + dateString + '"';
    var url = getUrlWithQuery(repository, query);

    requestAvgNumber(url, counterId, 0);
}

function requestAvgNumber(url, counterId, avgNumber) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.setRequestHeader('Authorization', 'Bearer ' + access_token);
    request.onreadystatechange = function() {
        if (this.readyState != 4) return;

        if (this.status == 200) {
            var data = JSON.parse(this.responseText);
            var pull_requests = data.values;
            pull_requests.forEach(pr => {
                avgNumber++;

                var newValue = Math.round(parseInt(avgNumber) / 4);
                document.getElementById(counterId).innerHTML = newValue;
                localStorage.setItem(counterId, newValue);
            })

            if (data.next) {
                requestAvgNumber(data.next, counterId, avgNumber);
            }
        }
    };
    request.send();
}

function bindRepoChangeButtons() {
    var repo_change_btns = document.querySelectorAll('.repo-change');
    for (var i = 0; i < repo_change_btns.length; i++) {
        repo_change_btns[i].addEventListener('click', function(event) {
            localStorage.setItem('current_repo', event.target.dataset.repo);
            window.location = './home.html?repo=' + event.target.dataset.repo;
        });
    }
}

function createRepoChangeButtons() {
    for (var i = 0; i < repositories.length; i++) {
        var htmlValue = '<button class="cybr-btn repo-change" data-repo="' + repositories[i] + '">' +
            repositories[i] + '<span aria-hidden>_</span>' +
            '<span aria-hidden class="cybr-btn__glitch">' + repositories[i] + '</span>' +
            '<span aria-hidden class="cybr-btn__tag">repo</span>' +
            '</button>';

        document.getElementById('repo-btn-group').innerHTML = document.getElementById('repo-btn-group').innerHTML + htmlValue;
    }
}

function init() {
    var today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    var lastCheckDate = localStorage.getItem('lastCheckDate');

    var isLocal = false;
    // If datas were already checked today, restore them from storage 
    if (new Date(lastCheckDate) >= today) {
        isLocal = true;
    }

    countLastWeekAverageTimeToReply(current_repo, isLocal);
    countLastMonthAverageTimeToReply(current_repo, isLocal);

    countOpenPullRequest(current_repo, isLocal);
    countLastWeekMergedPullRequests(current_repo, isLocal);
    countLastMonthMergedPullRequests(current_repo, isLocal);

    countLastWeekAverageTimeToMerge(current_repo, isLocal);
    countLastMonthAverageTimeToMerge(current_repo, isLocal);
    countAverageNumber(current_repo, isLocal);

    createRepoChangeButtons();
    bindRepoChangeButtons();

    document.getElementById('h').innerHTML = current_repo.toUpperCase();

    localStorage.setItem('lastCheckDate', today);
}

init();