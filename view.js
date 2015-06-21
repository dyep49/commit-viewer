const phantom = require('phantom');
const NodeGit = require('nodegit');
const path = require('path');
const Q = require('q');
const argv = require('optimist').argv;

const pathToRepo = path.resolve(argv.i);
const pagePath = 'file://' + path.resolve(argv.f);
const outputFolder = path.resolve(argv.o);

var eventEmitter;
var commitArray = [];
var repository;

var branches = [];

function main() {
  getMasterCommit(pathToRepo)
  .then(buildCommitHistory)
  .done(handleErrors);
}

function cleanupBranches() {
  console.log('cleaning up');
  repository.checkoutBranch('master');
  branches.forEach(function(branch) {
    var result = NodeGit.Branch.delete(branch);
    console.log(result);
  })
}

function handleErrors(err) {
  if(err) console.log(err);
  console.log('done');
}

function buildCommitHistory(commit) {
  var eventEmitter = commit.history();
  eventEmitter.on('end', function(commits) {
    buildScreenshotChain(commits)
    .then(console.log);
  })
  eventEmitter.on('err', console.log);

  eventEmitter.start();
}

function buildScreenshotChain(commits) {
  return commits.reduce(function(soFar, commit) {
    console.log('a');
    return soFar.then(function() {
      return createBranchAndScreenshot(commit);
    });
  }, Q()).done(function() {
    cleanupBranches();
    console.log('tests')
  })
}

function getMasterCommit(pathToRepo) {
  return NodeGit.Repository.open(pathToRepo).then(function(repo) {
    repository = repo;
    return repo.getBranchCommit('master');
  })
}

function createBranchAndScreenshot(commit) {
  var branchName = 'temporary' + Date.now();
  return NodeGit.Branch.create(repository, branchName, commit, 1, repository.defaultSignature(), "Created branch")
  .then(function(reference) {
    branches.push(reference);
    repository.checkoutBranch(branchName)
    return takeScreenshot(pagePath).then(function() {
      repository.checkoutBranch('master');
      var num = NodeGit.Branch.delete(reference);
      console.log(num);
    })
  });
}

function test(a) {
  console.log('test', a);
}


function takeScreenshot(filePath) {
  var deferred = Q.defer();

  phantom.create(function(ph) {
    ph.createPage(function(page) {
      page.open(pagePath, function(status) {
        var time = new Date().getTime();
        
        page.evaluate(function() {
          var style = document.createElement('style'),
              text = document.createTextNode('body { background: #fff }');
          style.setAttribute('type', 'text/css');
          style.appendChild(text);
          document.head.insertBefore(style, document.head.firstChild);
        });

        page.render(outputFolder + '/test' + time + '.png');
        ph.exit();
        deferred.resolve();
      })
    })
  });

  return deferred.promise;
}


main();


