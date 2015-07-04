//example 
//node view.js -i ./../example-commit-viewer -f ./../example-commit-viewer/index.html -o ./example/

const phantom = require('phantom');
const NodeGit = require('nodegit');
const path = require('path');
const Q = require('q');
const _ = require('underscore');
const argv = require('optimist').argv;

const pathToRepo = path.resolve(argv.i);
const pagePath = 'file://' + path.resolve(argv.f);
const outputFolder = path.resolve(argv.o);

var eventEmitter;
var commitArray = [];
var repository;
var branches = []


NodeGit.Repository.open(pathToRepo)
.then(getMasterCommit)
.then(getCommits)
.then(buildScreenshotChain)
.then(deleteBranches)
.done(console.log)

//Switch to master branch
  //Get a list of commits
    //For each commit
      //Create a branch pointed at that commit
        //Checkout that branch
          //Take screenshot
            //Delete branch
function getCommits(masterCommit) {
  var deferred = Q.defer();
  var eventEmitter = masterCommit.history();
  
  eventEmitter.on('end', function(commits) {
    deferred.resolve(commits);
  })

  eventEmitter.on('err', function() {
    deferred.reject();
  })

  eventEmitter.start();

  return deferred.promise;
}


function deleteBranches(reference) {
  repository.checkoutBranch('master');
  branches.forEach(function(branch) {
    var status = NodeGit.Branch.delete(branch);
  })
}


function buildScreenshotChain(commits) {
  return commits.reduce(function(soFar, commit) {
    return soFar.then(function() {
      var ref;
      return createBranch(commit)
             .then(function(reference) {
                ref = reference;
                branches.push(reference)
                repository.checkoutBranch(reference);
                return reference
              })
             .then(function(reference) {
               return takeScreenshot();
             })
    });
  }, Q())
}

function getMasterCommit(repo) {
  repository = repo;
  return repo.getBranchCommit('master');
}

function createBranch(commit) {
  var branchName = 'temporary' + Date.now();
  return NodeGit.Branch.create(repository, branchName, commit, 1, repository.defaultSignature(), "Created branch")
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



