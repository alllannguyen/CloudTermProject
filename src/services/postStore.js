const { DeleteCommand, GetCommand, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const { dynamoDbClient } = require("../awsClients");

function getPostsTableName() {
  if (!process.env.POSTS_TABLE_NAME) {
    throw new Error("POSTS_TABLE_NAME is required.");
  }

  return process.env.POSTS_TABLE_NAME;
}

function sortPosts(posts, sort = "newest") {
  return posts.sort((firstPost, secondPost) => {
    const firstDate = new Date(firstPost.createdAt).getTime();
    const secondDate = new Date(secondPost.createdAt).getTime();

    if (sort === "oldest") {
      return firstDate - secondDate;
    }

    return secondDate - firstDate;
  });
}

async function listPosts({ type, sort }) {
  let posts = [];
  let lastEvaluatedKey;

  do {
    const result = await dynamoDbClient.send(
      new ScanCommand({
        TableName: getPostsTableName(),
        ExclusiveStartKey: lastEvaluatedKey
      })
    );

    posts = posts.concat(result.Items || []);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  if (type === "lost" || type === "found") {
    posts = posts.filter((post) => post.type === type);
  }

  return sortPosts(posts, sort);
}

async function getPost(id) {
  const result = await dynamoDbClient.send(
    new GetCommand({
      TableName: getPostsTableName(),
      Key: { id }
    })
  );

  return result.Item || null;
}

async function createPost(post) {
  await dynamoDbClient.send(
    new PutCommand({
      TableName: getPostsTableName(),
      Item: post,
      ConditionExpression: "attribute_not_exists(id)"
    })
  );
}

async function deletePost(id) {
  const result = await dynamoDbClient.send(
    new DeleteCommand({
      TableName: getPostsTableName(),
      Key: { id },
      ReturnValues: "ALL_OLD"
    })
  );

  return result.Attributes || null;
}

module.exports = {
  createPost,
  deletePost,
  getPost,
  listPosts
};
