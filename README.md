# Post Limits Bot

Post Limits Bot is a Devvit moderation app that lets communities set karma and comment-count limits for posts. When a post reaches either configured limit, the app removes it and preserves its body in a distinguished comment.

The app also supports a separate set of limits for throwaway accounts identified by a configurable username prefix.

## Configuration

Moderators can configure:

- A karma limit for general posts
- A comment limit for general posts
- A username prefix used to identify throwaway accounts
- A karma limit for throwaway-account posts
- A comment limit for throwaway-account posts

The app checks tracked posts every five minutes.

## Devvit app

[View Post Limits Bot on Reddit's Developer Platform](https://developers.reddit.com/apps/post-limits-bot)

## Development

This repository contains the source for the currently published Devvit app, which uses `@devvit/public-api` 0.10.0.

```sh
yarn install
yarn test
```

## License

BSD 3-Clause License. See [LICENSE](LICENSE).
