/**
 * Chainable Supabase mock with FIFO result queue.
 *
 * Tests enqueue results in the order the route will consume them:
 *   mockSupabase._enqueue({ data: user }, { data: property })
 *
 * Each terminal await (`.single()`, bare select, insert, update, delete)
 * dequeues the next result.
 *
 * NOTE: This file is imported inside vi.mock() factories, so it must NOT
 * reference `vi` at the top level. Use plain functions/stubs instead.
 */

interface QueuedResult {
  data: any;
  error: any;
  count?: number | null;
}

interface CallLogEntry {
  table: string;
  methods: string[];
}

function createNoopFn() {
  const fn: any = (..._args: any[]) => {
    fn._calls.push([..._args]);
    return fn._returnValue;
  };
  fn._calls = [] as any[][];
  fn._returnValue = undefined;
  fn.mockReturnValue = (val: any) => { fn._returnValue = val; return fn; };
  fn.mockResolvedValue = (val: any) => { fn._returnValue = Promise.resolve(val); return fn; };
  fn.mockClear = () => { fn._calls = []; };
  return fn;
}

function createSupabaseMock() {
  let queue: QueuedResult[] = [];
  let callLog: CallLogEntry[] = [];

  // Storage sub-mock
  const storageBucketMock = {
    upload: createNoopFn().mockResolvedValue({ data: { path: "mock-path" }, error: null }),
    download: createNoopFn().mockResolvedValue({ data: new Blob(), error: null }),
    remove: createNoopFn().mockResolvedValue({ data: null, error: null }),
    createSignedUrl: createNoopFn().mockResolvedValue({
      data: { signedUrl: "https://mock-signed-url.com/photo" },
      error: null,
    }),
  };

  const storageFrom = createNoopFn().mockReturnValue(storageBucketMock);

  const storage = {
    from: storageFrom,
  };

  function createChain(table: string) {
    const methods: string[] = [];

    function dequeue(): QueuedResult {
      const result = queue.shift();
      if (!result) {
        return { data: null, error: null, count: null };
      }
      return result;
    }

    const chain: any = {
      select(..._args: any[]) {
        methods.push("select");
        return chain;
      },
      insert(..._args: any[]) {
        methods.push("insert");
        return chain;
      },
      update(..._args: any[]) {
        methods.push("update");
        return chain;
      },
      delete(..._args: any[]) {
        methods.push("delete");
        return chain;
      },
      eq(..._args: any[]) {
        methods.push("eq");
        return chain;
      },
      in(..._args: any[]) {
        methods.push("in");
        return chain;
      },
      single() {
        methods.push("single");
        callLog.push({ table, methods: [...methods] });
        return Promise.resolve(dequeue());
      },
      maybeSingle() {
        methods.push("maybeSingle");
        callLog.push({ table, methods: [...methods] });
        return Promise.resolve(dequeue());
      },
      order(..._args: any[]) {
        methods.push("order");
        return chain;
      },
      limit(..._args: any[]) {
        methods.push("limit");
        return chain;
      },
      head(..._args: any[]) {
        methods.push("head");
        return chain;
      },
      // Make the chain thenable so `await supabase.from("x").select("*")` works
      then(resolve: any, reject?: any) {
        callLog.push({ table, methods: [...methods] });
        const result = dequeue();
        return Promise.resolve(result).then(resolve, reject);
      },
    };

    return chain;
  }

  const fromFn = (table: string) => createChain(table);
  const from = Object.assign(fromFn, { _calls: [] as any[][] });

  const mock = {
    from,
    storage,

    // Test helpers
    _enqueue(...results: QueuedResult[]) {
      queue.push(...results);
    },
    _getCallLog(): CallLogEntry[] {
      return [...callLog];
    },
    _reset() {
      queue = [];
      callLog = [];
      storageFrom.mockClear();
      storageFrom.mockReturnValue(storageBucketMock);
      storageBucketMock.upload.mockClear();
      storageBucketMock.download.mockClear();
      storageBucketMock.remove.mockClear();
      storageBucketMock.createSignedUrl.mockClear();
    },
  };

  return mock;
}

export type MockSupabase = ReturnType<typeof createSupabaseMock>;
export { createSupabaseMock };
