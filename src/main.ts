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

  async function getReleaseTags() {
    const result = await instance.get<
      {
        name: string;
      }[]
    >(`/repos/${process.env.GITHUB_REPOSITORY}/tags`);

    if (result.data) {
      const regExpString = `/${tagPrefix}(\\d+)$`;
      const regExp = new RegExp(regExpString);

      return result.data.filter(x => regExp.test(x.name));
    }

    return [];
  }
}

/*
    get all tags that match pattern
    if no tags, set to 1, end.

    order tags, get latest
    create new tag of latest + 1
    push new tag
*/

main();
