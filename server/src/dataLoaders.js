/**
 * ============================================================
 *  DATALOADER — N+1 PROBLEM SOLVER
 * ============================================================
 *  PROBLEM: Imagine querying 10 posts. For each post, GraphQL
 *  calls the `author` resolver → 10 separate DB lookups for users.
 *  That's N+1 queries (1 for posts list + N for each author).
 *
 *  SOLUTION: DataLoader collects all user IDs requested within
 *  a single "tick" of the event loop, then fires ONE batched
 *  DB call for all of them.
 *
 *  IMPORTANT RULE: Create NEW DataLoader instances per REQUEST
 *  inside the context function. Never share them across requests
 *  or the per-request cache will leak between users.
 * ============================================================
 */

const DataLoader = require("dataloader");
const { db } = require("./data/store");

/**
 * Creates a fresh set of DataLoader instances for a single request.
 * Call this inside your context function.
 */
function createLoaders() {
  return {
    /**
     * userLoader: given an array of user IDs, returns users in the same order.
     *
     * Without DataLoader:
     *   post[0].author resolver → db.users.findById("user-1")   ← 1 query
     *   post[1].author resolver → db.users.findById("user-2")   ← 1 query
     *   post[2].author resolver → db.users.findById("user-1")   ← 1 query (duplicate!)
     *   Total: N queries
     *
     * With DataLoader:
     *   All three IDs ["user-1", "user-2", "user-1"] are collected into one batch.
     *   DataLoader deduplicates → ["user-1", "user-2"]
     *   ONE call: db.users.findManyByIds(["user-1", "user-2"])
     *   Results are cached within this request — "user-1" hit only once.
     */
    userLoader: new DataLoader(
      async (ids) => {
        console.log(
          `\n🔵 [DataLoader] Batching ${ids.length} user lookups: [${ids.join(", ")}]`
        );
        const users = db.users.findManyByIds(ids);
        return users;
      },
      {
        // cache: true (default) — within a request, same ID → cached result
        // Set cache: false only if you need fresh data on every field resolution
        cache: true,
      }
    ),
  };
}

module.exports = { createLoaders };
