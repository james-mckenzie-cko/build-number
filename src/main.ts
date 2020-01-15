import * as core from '@actions/core';
import axios from 'axios';

async function main() {
  const token = core.getInput('token');
  const tagPrefix = core.getInput('prefix');

  const instance = axios.create({
    baseURL: 'https://api.github.com',
  });

  instance.defaults.headers.common['Authorization'] = `token ${token}`;

  const releaseTags = await getReleaseTags();

  console.log(releaseTags);

  let nextRelease;

  if (releaseTags.length === 0) {
    nextRelease = createTagName(1);
  } else {
    nextRelease = createTagName(Math.max(...releaseTags) + 1);
  }

  console.log(nextRelease);

  await pushReleaseTag(nextRelease);

  async function getReleaseTags() {
    try {
      const result = await instance.get<
        {
          name: string;
        }[]
      >(`/repos/${process.env.GITHUB_REPOSITORY}/tags`);

      if (result.data) {
        const regExpString = `/${tagPrefix}\d+$/`;
        const regExp = new RegExp(regExpString);

        return result.data
          .filter(x => {
            console.log(regExp.test(x.name));

            return regExp.test(x.name);
          })
          .map(x => Number(x.name.replace(tagPrefix, '')))
          .sort();
      }

      return [];
    } catch (e) {
      core.setFailed(`Couldn't get Release Tags : ${e.message}`);
      return [];
    }
  }

  async function pushReleaseTag(tag: { ref: string; sha: string }) {
    try {
      await instance.post(
        `/repos/${process.env.GITHUB_REPOSITORY}/git/refs`,
        tag
      );
    } catch (e) {
      core.setFailed(`Couldn't push Release Tag : ${e.message}`);
    }
  }

  function createTagName(buildNumber: number) {
    return {
      ref: `refs/tags/${tagPrefix}${buildNumber}`,
      sha: process.env.GITHUB_SHA,
    };
  }
}

main();
