const phantom = require('phantom');
const NodeGit = require('nodegit');
const path = require('path');
const Q = require('q');

var pagePath = 'file:///home/dylan/Projects/example-commit-viewer/index.html';

var eventEmitter;
var commitArray = [];

var pathToRepo = path.resolve('../example-commit-viewer');

var repository;

NodeGit.Repository.open(pathToRepo).then(function(repo) {
  repository = repo;
  repo.checkoutBranch('gh-pages')
  return repo.getBranchCommit('master');
}).then(function(commit) {
  eventEmitter = commit.history();

  eventEmitter.on('end', function(commits) {
    commits.reduce(function(soFar, c) {
      return soFar.then(function() {
        return createBranchAndScreenshot(c, repository)
      });
    }, Q()).done(function() {
      console.log('donezo')
    })


  });

  eventEmitter.on('error', function(error) {
    console.log(error);
  });

  eventEmitter.start();
}).done(function(e) {
  console.log('done');
  console.log(e);
})

// takeScreenshot(pagePath).then(function() {
//   console.log(done);
// })
function createBranchAndScreenshot(commit, repository) {
  var branchName = commit.id().toString() + Date.now()
  return NodeGit.Branch.create(repository, branchName, commit, 1, repository.defaultSignature(), "Created branch")
  .then(function(reference) {
    repository.checkoutBranch(branchName, {})
    return takeScreenshot(pagePath)
  });
}


function takeScreenshot(filePath) {
  var deferred = Q.defer();

  phantom.create(function(ph) {
    ph.createPage(function(page) {
      page.open(pagePath, function(status) {
        var time = new Date().getTime();
        page.render('test' + time + '.png');
        ph.exit();
        deferred.resolve();
      })
    })
  });

  return deferred.promise;
}





