// Visit developers.reddit.com/docs to learn Devvit!
import { Devvit, Post, RedditAPIClient } from "@devvit/public-api";
Devvit.configure({
  kvStore: true,
  redditAPI: true,
});

const settingOptions: any = [
  {
    type: "number",
    name: "gKarmaLimit",
    label:
      "Karma limit for general posts. After this threshold, posts will be removed and the content will added as a stickied comment.",
  },
  {
    type: "number",
    name: "gCommLimit",
    label: "Limit for the number of top level comments a general post can get.",
  },
  {
    type: "string",
    name: "startsW",
    label: "Throwaway username prefix. For ex: *throwRA*",
  },
  {
    type: "number",
    name: "sKarmaLimit",
    label:
      "Karma limit for posts from throwaway accounts. After this threshold, posts will be removed and the content will added as a stickied comment.",
  },
  {
    type: "number",
    name: "sCommLimit",
    label:
      "Limit for the number of top level comments on posts from throwaway accounts.",
  },
];

Devvit.addSettings(settingOptions);

Devvit.addSchedulerJob({
  name: "check-posts",
  onRun: async (_, context) => {
    try {
      console.log("check-posts handler called", _);
      const { kvStore } = context;
      const postKind1 = (await kvStore.get("postKind1")) as Array<string>;
      const postKind2 = (await kvStore.get("postKind2")) as Array<string>;
      if (postKind1 === undefined && postKind2 === undefined) {
        console.log("no posts to process");
        return;
      }
      for (const posts1 of postKind1) {
        await checkP(posts1, context, 1);
      }
      for (const posts2 of postKind2) {
        await checkP(posts2, context, 2);
      }
      console.log("posts1", JSON.stringify(postKind1));
      console.log("posts2", JSON.stringify(postKind2));
    } catch (e) {
      console.log("handler couldn't run", e);
      throw e;
    }
  },
});

Devvit.addTrigger({
  events: ["AppInstall", "AppUpgrade"],
  onEvent: async (_, context) => {
    let jobs = await context.scheduler.listJobs();
    await Promise.all(jobs.map((j) => context.scheduler.cancelJob(j.id)));
    try {
      console.log(_);
      const { kvStore } = context;
      const postKind1: [] = [];
      const postKind2: [] = [];
      await kvStore.put("postKind1", postKind1);
      await kvStore.put("postKind2", postKind2);
      await context.scheduler.runJob({
        cron: "*/5 * * * *",
        name: "check-posts",
        data: {},
      });
      console.log("scheduling complete");
    } catch (e) {
      console.log("error was not able to schedule:", e);
      throw e;
    }
  },
});

Devvit.addTrigger({
  event: "PostSubmit",
  onEvent: async (event, context) => {
    const { reddit, kvStore } = context;
    console.log("post triggered", event);
    const startW = (
      (await context.settings.get("startsW")) as string
    ).toLocaleLowerCase();
    const postId = event.post?.id;
    console.log(postId, "post Id");
    if (postId === undefined) {
      return;
    }
    const post = await reddit.getPostById(postId);
    const author = (post.authorName as string).toLowerCase();
    if (author.startsWith(startW)) {
      const postKind2 = (await kvStore.get("postKind2")) as Array<string>;
      postKind2.unshift(postId);
      if (postKind2.length > 200) {
        postKind2.length = 200;
      }
      await kvStore.put("postKind2", postKind2);
      console.log(JSON.stringify(postKind2), "post list kind 2");
    } else {
      const postKind1 = (await kvStore.get("postKind1")) as Array<string>;
      postKind1.unshift(postId);
      if (postKind1.length > 200) {
        postKind1.length = 200;
      }
      console.log(JSON.stringify(postKind1), "post list kind 1");
      await kvStore.put("postKind1", postKind1);
    }
  },
});

async function checkP(
  postId: string,
  context: Devvit.Context,
  postKind: number
) {
  const { reddit, kvStore } = context;
  const post = await reddit.getPostById(postId);
  const commNum = post.numberOfComments;
  const karma = post.score;
  const isR = post.isRemoved();
  if (postKind === 1) {
    const gLimit = (await context.settings.get("gKarmaLimit")) as number;
    const cGLimit = (await context.settings.get("gCommLimit")) as number;
    if ((karma >= gLimit || commNum >= cGLimit) && isR === false) {
      await removeP(postId, post, reddit);
    }
  } else {
    const sLimit = (await context.settings.get("sKarmaLimit")) as number;
    const cSLimit = (await context.settings.get("sCommLimit")) as number;
    if ((karma >= sLimit || commNum >= cSLimit) && isR === false) {
      await removeP(postId, post, reddit);
    }
  }
}

async function removeP(postId: string, post: Post, reddit: RedditAPIClient) {
  const content = post.body;
  await reddit.remove(postId, false);
  const comment = await reddit.submitComment({
    id: postId,
    text: `This post has reached one of our comment/karma limits. The text of the post has been preserved below.\n
___\n
${content}
    `,
  });
  comment.distinguish(true);
}

export default Devvit;
