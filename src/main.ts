import * as core from '@actions/core';

const doSomething = () => {
  core.getInput('token');
  core.setOutput('build_number', '1');

  console.log('hello world');
};

doSomething();
