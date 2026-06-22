const http = require('http');

function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.substring(0, 100)}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  const BASE_URL = 'http://127.0.0.1:5000';
  console.log('--- Starting Automated Pagination Tests ---');

  try {
    // 1. Fetch Page 1
    console.log('1. Fetching Page 1 (limit 5)...');
    const res1 = await makeRequest(`${BASE_URL}/api/products?limit=5`);
    if (!res1.success) throw new Error('Failed to fetch Page 1');
    const page1Ids = res1.products.map(p => p._id);
    const page1Names = res1.products.map(p => p.name);
    console.log(`   Page 1 items:`, page1Names);
    console.log(`   Next Cursor:`, res1.pagination.next_cursor);
    console.log(`   Prev Cursor:`, res1.pagination.prev_cursor);

    if (page1Ids.length !== 5) throw new Error(`Expected 5 items, got ${page1Ids.length}`);
    if (res1.pagination.prev_cursor !== null) throw new Error('Expected prev_cursor to be null on Page 1');

    // 2. Fetch Page 2
    console.log('\n2. Fetching Page 2 using next_cursor...');
    const nextCursor = res1.pagination.next_cursor;
    const res2 = await makeRequest(`${BASE_URL}/api/products?limit=5&next=${nextCursor}`);
    if (!res2.success) throw new Error('Failed to fetch Page 2');
    const page2Ids = res2.products.map(p => p._id);
    const page2Names = res2.products.map(p => p.name);
    console.log(`   Page 2 items:`, page2Names);

    // Check no duplicates between Page 1 and Page 2
    const duplicates12 = page2Ids.filter(id => page1Ids.includes(id));
    if (duplicates12.length > 0) {
      throw new Error(`Found duplicates between Page 1 and Page 2: ${duplicates12}`);
    }
    console.log('   ✓ Checked: No duplicates between Page 1 and Page 2.');

    // 3. Simulate adding 5 new products in the background
    console.log('\n3. Simulating 5 new product insertions at the top (newest)...');
    const simRes = await makeRequest(`${BASE_URL}/api/products/simulate`, 'POST', { count: 5 });
    if (!simRes.success) throw new Error('Simulation endpoint failed');
    console.log(`   ✓ ${simRes.message}`);

    // 4. Fetch Page 3 from Page 2's next_cursor
    console.log('\n4. Fetching Page 3 using Page 2 next_cursor (moving forward in time)...');
    const page2NextCursor = res2.pagination.next_cursor;
    const res3 = await makeRequest(`${BASE_URL}/api/products?limit=5&next=${page2NextCursor}`);
    if (!res3.success) throw new Error('Failed to fetch Page 3');
    const page3Ids = res3.products.map(p => p._id);
    const page3Names = res3.products.map(p => p.name);
    console.log(`   Page 3 items:`, page3Names);

    // Verify Page 3 contains none of Page 1 or Page 2
    const duplicates23 = page3Ids.filter(id => page2Ids.includes(id) || page1Ids.includes(id));
    if (duplicates23.length > 0) {
      throw new Error(`Found duplicates or shifted items on Page 3: ${duplicates23}`);
    }
    console.log('   ✓ Checked: No duplicates or shifts on Page 3.');

    // 5. Navigate backwards to Page 1 using Page 2's prev_cursor
    console.log('\n5. Navigating backward to Page 1 using Page 2 prev_cursor...');
    const page2PrevCursor = res2.pagination.prev_cursor;
    const resPrev = await makeRequest(`${BASE_URL}/api/products?limit=5&prev=${page2PrevCursor}`);
    if (!resPrev.success) throw new Error('Failed to fetch Page 1 items backwards');
    const prevIds = resPrev.products.map(p => p._id);
    const prevNames = resPrev.products.map(p => p.name);
    console.log(`   Page 1 items retrieved backward:`, prevNames);

    // Verify it returns exactly the same items as the original Page 1
    const match = page1Ids.every((val, idx) => val === prevIds[idx]);
    if (!match) {
      throw new Error(`Backward page navigation did not match original Page 1!\nExpected: ${page1Names}\nGot: ${prevNames}`);
    }
    console.log('   ✓ Checked: Backward page matches original Page 1 exactly.');
    console.log('   ✓ Checked: Newly inserted items did NOT disrupt or appear in the middle of current paginated list.');

    // 6. Fetch Page 1 without cursors to verify new items show up at the very top
    console.log('\n6. Reloading Page 1 without cursors (simulating initial load)...');
    const resFresh = await makeRequest(`${BASE_URL}/api/products?limit=5`);
    const freshNames = resFresh.products.map(p => p.name);
    console.log(`   Fresh Page 1 items:`, freshNames);
    const newItemsCount = freshNames.filter(n => n.includes('(Simulated')).length;
    console.log(`   Number of simulated items at the top: ${newItemsCount}`);
    if (newItemsCount === 0) {
      throw new Error('Expected newly simulated items to appear on a fresh Page 1 load');
    }
    console.log('   ✓ Checked: Fresh Page 1 displays newly inserted items at the top.');

    console.log('\n--- ALL PAGINATION CORRECTNESS TESTS PASSED SUCCESSFULY! ---');
  } catch (error) {
    console.error('\n--- TEST FAILED ---');
    console.error(error.message);
  }
}

runTests();
