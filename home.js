const urlParams = new URLSearchParams(window.location.search);
const repositories = localStorage.getItem('bitbucket_repositories').split(',');
const current_repo = urlParams.get('repo') || localStorage.getItem('current_repo') || repositories[0];
const accountid = localStorage.getItem('bitbucket_accountid');

function bindRepoChangeButtons() {
    var repo_change_btns = document.querySelectorAll('.repo-change');
    for (var i = 0; i < repo_change_btns.length; i++) {
        repo_change_btns[i].addEventListener('click', function(event) {
            if(!event.target.dataset.repo) return;
            localStorage.setItem('current_repo', event.target.dataset.repo);
            window.location = './home.html?repo=' + event.target.dataset.repo;
        });
    }
}

function createRepoChangeButtons() {
    document.getElementById('repo-btn-group').innerHTML = '';

    for (var i = 0; i < repositories.length; i++) {
        if (!repositories[i]) continue;

        var htmlValue = '<button class="cybr-btn repo-change" data-repo="' + repositories[i] + '">' +
            repositories[i] + '<span aria-hidden>_</span>' +
            '<span aria-hidden class="cybr-btn__glitch">' + repositories[i] + '</span>' +
            '<span aria-hidden class="cybr-btn__tag">repo</span>' +
            '</button>';

        document.getElementById('repo-btn-group').innerHTML = document.getElementById('repo-btn-group').innerHTML + htmlValue;
    }

    bindRepoChangeButtons();
}

function displayPullRequests(pullRequests) {
    document.getElementById('pull_requests').innerHTML = '';
    document.getElementById('pull_requests_title').innerHTML = pullRequests.length + ' pull request(s)'

    for (var i = 0; i < pullRequests.length; i++) {
        if (!pullRequests[i]) continue;

        var htmlValue = 
        '<p><a href="https://bitbucket.org/' + accountid + '/' + current_repo + '/pull-requests/' +
        pullRequests[i].id
        +'" target="_blank">#' +
        pullRequests[i].id + '</a> responded in ' + pullRequests[i].response_time + 'h </p';

        document.getElementById('pull_requests').innerHTML = document.getElementById('pull_requests').innerHTML + htmlValue;
    }
}

function displaySummary(summary) {
    document.getElementById('week').innerHTML = (new Date(summary.checked_week)).toDateString();

    document.getElementById('average').innerHTML = summary.average_response_time + 'h';
    document.getElementById('median').innerHTML = summary.median_response_time + 'h';
}

function fetchReport (callback) {
    var clientId = localStorage.getItem('bitbucket_clientid');
    var secret = localStorage.getItem('bitbucket_secret');

    var request = new XMLHttpRequest();
    request.open('GET', './api/' + accountid + '/' + current_repo, true);
    request.setRequestHeader('Authorization', 'Basic ' + btoa(clientId + ':' + secret));
    request.withCredentials = true;

    request.onreadystatechange = function() {
        if (this.readyState != 4) return;

        if (this.status == 200) {
            var data = JSON.parse(this.responseText);
            callback(data);
        }
    };

    request.send();
}

function fetchLocalReport(callback) {
	callback(JSON.parse(localStorage.getItem('data_' + current_repo)));
}
  
function init() {
    var today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
	var lastCheckDate = localStorage.getItem('lastCheckDate_' + current_repo);

    createRepoChangeButtons();

    // If datas were already checked today, restore them from storage 
    if (new Date(lastCheckDate) >= today) {
        fetchLocalReport((data) => {
            displaySummary(data);
            displayPullRequests(data.details);
        });
    }
    else {
        fetchReport((data) => {
            displaySummary(data);
            displayPullRequests(data.details);
            localStorage.setItem('data_' + current_repo, JSON.stringify(data));
        });
    }

    document.getElementById('h').innerHTML = current_repo.toUpperCase();

    localStorage.setItem('lastCheckDate_' + current_repo, today);
}

init();