const { ApolloServer } = require("apollo-server");
const { PrismaClient } = require("@prisma/client");
// ... previous import statements
const { PubSub } = require("apollo-server");
const pubsub = new PubSub();
const Subscription = require('./resolvers/Subscription')

const Query = require("./resolvers/Query");
const Mutation = require("./resolvers/Mutation");
const User = require("./resolvers/User");
const Link = require("./resolvers/Link");
const Vote = require('./resolvers/Vote')

// 1

// 2
const resolvers = {
  Query,
  Mutation,
  Subscription,
  User,
  Link,
  Vote,
};

// 3
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const { getUserId } = require("./utils");

const server = new ApolloServer({
  typeDefs: fs.readFileSync(path.join(__dirname, "schema.graphql"), "utf8"),
  resolvers,
  context: ({ req }) => {
    return {
      ...req,
      prisma,
      pubsub,
      userId: req && req.headers.authorization ? getUserId(req) : null,
    };
  },
});

server.listen().then(({ url }) => console.log(`Server is running on ${url}`));