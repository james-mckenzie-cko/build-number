import * as core from '@actions/core';
import { context, GitHub } from '@actions/github';
import axios from 'axios';

interface Tag {
  name: string;
  commit: { sha: string };
}

async function main() {
  const token = core.getInput('token');
  const tagPrefix = core.getInput('prefix');

  const instance = axios.create({
    baseURL: 'https://api.github.com',
  });

  const ghClient = new GitHub(token);

  instance.defaults.headers.common['Authorization'] = `token ${token}`;

  const tags = await getTags();
  const releaseTags = filterTags(tags);

  const releaseTagMapped = releaseTags.map(x => ({
    number: Number(x.name.replace(tagPrefix, '')),
    ...x,
  }));

  const lastRelease = releaseTagMapped.sort((a, b) => {
    return a.number - b.number;
  })[0];

  const nextReleaseNumber =
    releaseTags.length === 0
      ? 1
      : Math.max(...releaseTagMapped.map(x => x.number)) + 1;

  const nextRelease = createTagName(nextReleaseNumber);

  await pushReleaseTag(nextRelease);

  await commentOnPr(`
    released build ${nextReleaseNumber}
    diff: [](https://github.com/${process.env.GITHUB_REPOSITORY}/compare/${lastRelease.commit.sha}...${nextRelease.sha}) 
  `);

  /* ((((((((((((((((((((((((((((((())))))))))))))))))))))))))))))) */

  function filterTags(tags: Tag[]) {
    const regExpString = `${tagPrefix}\\d+$`;
    const regExp = new RegExp(regExpString);

    return tags.filter(x => regExp.test(x.name));
  }

  async function getTags() {
    try {
      const result = await instance.get<Tag[]>(
        `/repos/${process.env.GITHUB_REPOSITORY}/tags`
      );

      if (result.data) {
        return result.data;
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

  async function commentOnPr(message: string) {
    await ghClient.issues.createComment({
      ...context.repo,
      issue_number: context.payload.pull_request!.number,
      body: message,
    });
  }

  function createTagName(buildNumber: number) {
    return {
      ref: `refs/tags/${tagPrefix}${buildNumber}`,
      sha: process.env.GITHUB_SHA!,
    };
  }
}

main();
