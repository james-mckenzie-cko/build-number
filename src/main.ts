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

  const nextReleaseNumber =
    releaseTags.length === 0 ? 1 : Math.max(...releaseTags) + 1;

  const nextRelease = createTagName(nextReleaseNumber);

  await pushReleaseTag(nextRelease);

  core.setOutput('build_number', String(nextReleaseNumber));

  async function getReleaseTags() {
    try {
      const result = await instance.get<
        {
          name: string;
        }[]
      >(`/repos/${process.env.GITHUB_REPOSITORY}/tags`);

      if (result.data) {
        const regExpString = `${tagPrefix}\\d+$`;
        const regExp = new RegExp(regExpString);

        return result.data
          .filter(x => regExp.test(x.name))
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
      sha: process.env.GITHUB_SHA!,
    };
  }
}

main();
