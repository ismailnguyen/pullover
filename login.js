function login() {
    localStorage.setItem('bitbucket_accountid', document.getElementById('accountid').value);
    localStorage.setItem('bitbucket_repositories', document.getElementById('repositories').value.split(',').map(function(x) {
        return x.trim()
    }));
    localStorage.setItem('bitbucket_clientid', document.getElementById('clientid').value);
    localStorage.setItem('bitbucket_secret', document.getElementById('secret').value);

    window.location.href = 'index.html';
}

function prefill() {
	var bitbucket_accountid = localStorage.getItem('bitbucket_accountid');
	if (bitbucket_accountid) {
		document.getElementById('accountid').value = bitbucket_accountid;
	}
	
	var bitbucket_repositories = localStorage.getItem('bitbucket_repositories');
	if (bitbucket_repositories) {
		document.getElementById('repositories').value = bitbucket_repositories;
	}
	
	var bitbucket_clientid = localStorage.getItem('bitbucket_clientid');
	if (bitbucket_accountid) {
		document.getElementById('clientid').value = bitbucket_clientid;
	}
	
	var bitbucket_secret = localStorage.getItem('bitbucket_secret');
	if (bitbucket_secret) {
		document.getElementById('secret').value = bitbucket_secret;
	}
}

prefill();

document.getElementById('continue-btn').addEventListener('click', function() {
    login();
})