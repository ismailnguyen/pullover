function login() {
    localStorage.setItem('bitbucket_accountid', document.getElementById('accountid').value);
    localStorage.setItem('bitbucket_repositories', document.getElementById('repositories').value.split(',').map(function(x) {
        return x.trim()
    }));
    localStorage.setItem('bitbucket_clientid', document.getElementById('clientid').value);
    localStorage.setItem('bitbucket_secret', document.getElementById('secret').value);

    window.location.href = 'index.html';
}

document.getElementById('continue-btn').addEventListener('click', function() {
    login();
})