const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { APP_SECRET, getUserId } = require("../utils");
const { newLink } = require("./Subscription");

async function signup(parent, args, context, info) {
  // 1
  const password = await bcrypt.hash(args.password, 10);

  // 2
  const user = await context.prisma.user.create({
    data: { ...args, password },
  });

  // 3
  const token = jwt.sign({ userId: user.id }, APP_SECRET);

  // 4
  return {
    token,
    user,
  };
}

async function login(parent, args, context, info) {
  // 1
  const user = await context.prisma.user.findUnique({
    where: { email: args.email },
  });
  if (!user) {
    throw new Error("No such user found");
  }

  // 2
  const valid = await bcrypt.compare(args.password, user.password);
  if (!valid) {
    throw new Error("Invalid password");
  }

  const token = jwt.sign({ userId: user.id }, APP_SECRET);

  // 3
  return {
    token,
    user,
  };
}

async function post(parent, args, context, info) {
  const { userId } = context;

  const newLink = await context.prisma.link.create({
    data: {
      url: args.url,
      description: args.description,
      postedBy: { connect: { id: userId } },
    },
  });
  context.pubsub.publish("NEW_LINK", newLink);

  return newLink;
}

async function vote(parent, args, context, info) {
  // 1  the first step is to validate the incoming JWT with the getUserId helper function. If it’s valid, the function will return the userId of the User who is making the request. If the JWT is not valid, the function will throw an exception.
  const userId = context.userId;

  // 2 To protect against those pesky “double voters”, you need to check if the vote already exists or not. First, you try to fetch a vote with the same linkId and userId. If the vote exists, it will be stored in the vote variable, resulting in the boolean true from your call to Boolean(vote) — throwing an error kindly telling the user that they already voted.
  const vote = await context.prisma.vote.findUnique({
    where: {
      linkId_userId: {
        linkId: Number(args.linkId),
        userId: userId,
      },
    },
  });

  if (Boolean(vote)) {
    throw new Error(`Already voted for link: ${args.linkId}`);
  }

  // 3 If that Boolean(vote) call returns false, the vote.create method will be used to create a new Vote that’s connected to the User and the Link.
  const newVote = context.prisma.vote.create({
    data: {
      user: { connect: { id: userId } },
      link: { connect: { id: Number(args.linkId) } },
    },
  });
  context.pubsub.publish("NEW_VOTE", newVote);

  return newVote;
}

module.exports = {
  post,
  signup,
  login,
  vote,
};
