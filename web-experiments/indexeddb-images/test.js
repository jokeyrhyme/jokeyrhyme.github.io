/*jslint browser:true, indent:2*/
/*globals define, require*/ // Require.JS
/*globals mocha, suite, test, setup, teardown, suiteSetup, suiteTeardown*/ // Mocha

/*globals atob, btoa, ArrayBuffer, Blob, FileReader, Uint8Array, URL*/ // Web APIs
/*globals base64toBlob*/ // helper functions

require(['chai', 'IDBStore'], function (chai, IDBStore) {
  'use strict';

  var assert, store, url;

  mocha.setup('tdd');

  assert = chai.assert;

  url = '//placekitten.com/g/200/200';

  suite('browser compatibility', function () {

    test('browser supports XMLHttpRequest with CORS', function () {
      var xhr;
      assert.property(window, 'XMLHttpRequest');
      xhr = new XMLHttpRequest();
      assert.property(xhr, 'withCredentials');
    });

    test('browser supports Typed Arrays (e.g. ArrayBuffer)', function () {
      assert.property(window, 'ArrayBuffer');
    });

    test('browser supports binary-Base64 conversion', function () {
      assert.isFunction(atob);
      assert.isFunction(btoa);
    });

    test('browser supports File API', function () {
      var b;
      assert.property(window, 'Blob');
      try {
        b = new Blob(['hi'], { type: 'text/plain' });
        assert.ok(true, 'supports new Blob constructor');
      } catch (e) {
        assert.ok(false, 'supports new Blob constructor');
      }
      assert.property(window, 'FileReader');
      assert.property(window, 'URL');
      assert.isFunction(URL.createObjectURL, 'URL.createObjectURL');
      return b;
    });

    test('browser supports IndexedDB', function (done) {
      assert.isFunction(IDBStore);
      store = new IDBStore({
        storeName: 'test',
        storePrefix: 'web-experiments/indexeddb-images-',
        dbVersion: 1,
        onStoreReady: function () {
          assert.ok(true);
          done();
        },
        onError: function () {
          assert.ok(false, 'new IDBStore -> onError');
          done();
        }
      });
    });

    test('(optional) browser supports Blobs in IndexedDB', function () {
      var testBlob;
      testBlob = new Blob(['test'], { type: 'text/plain' });
      store.put({ id: 'blob', blob: testBlob });
    });

    suiteTeardown(function (done) {
      if (store && store.deleteDatabase) {
        store.deleteDatabase();
      }
      setTimeout(done, 1e3);
    });

  });

  suite('store image in IndexedDB', function () {
    var blob;

    test('store created via IDBStore()', function (done) {
      store = new IDBStore({
        storeName: 'blobs',
        storePrefix: 'web-experiments/indexeddb-images-',
        dbVersion: 1,
        onStoreReady: function () {
          assert.ok(true);
          done();
        },
        onError: function () {
          assert.ok(false, 'new IDBStore -> onError');
          done();
        }
      });
    });

    test('request image data', function (done) {
      var xhr;
      xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            assert.ok(true);
            blob = new Blob([xhr.response], { type: 'image/jpeg' });
          } else {
            assert.fail('image request failed');
          }
          done();
        }
      };
      xhr.setRequestHeader('Accept', 'image/jpeg');
      xhr.send(null);
    });

    test('save image data in store', function (done) {
      var fr;
      fr = new FileReader();
      fr.onloadend = function () {
        assert.ok(true);
        store.put({
          id: 'kitten.jpeg',
          data: fr.result,
          type: 'image/jpeg'
        }, function () { // onSuccess
          assert.ok(true);
          done();
        }, function () { // onError
          assert.fail('store.put() failed');
          done();
        });
      };
      fr.readAsDataURL(blob);
    });

  });

  suite('display image', function () {
    var blob;

    test('reconstruct Blob from store', function (done) {
      store.get('kitten.jpeg', function (obj) { // onSuccess
        var index, base64;
        index = obj.data.indexOf(',');
        base64 = obj.data.substring(index + 1);
        blob = base64toBlob(base64, obj.type);
        done();
      }, function () { // onError
        assert.fail('store.get() failed');
        done();
      });
    });

    test('show image via direct reference', function (done) {
      var img;
      img = document.getElementById('direct');
      img.addEventListener('load', function () {
        assert.equal(img.height, 200, 'correct height');
        assert.equal(img.width, 200, 'correct height');
        done();
      }, false);
      img.src = url;
    });

    test('show image via Data URI', function (done) {
      var img, fr;
      img = document.getElementById('datauri');
      img.addEventListener('load', function () {
        assert.equal(img.height, 200, 'correct height');
        assert.equal(img.width, 200, 'correct height');
        done();
      }, false);
      fr = new FileReader();
      fr.onloadend = function () {
        assert.ok(true);
        img.src = fr.result;
      };
      fr.readAsDataURL(blob);
    });

    test('show image via Blob URL', function (done) {
      var img;
      url = URL.createObjectURL(blob);
      assert.isString(url);
      img = document.getElementById('bloburl');
      img.addEventListener('load', function () {
        assert.equal(img.height, 200, 'correct height');
        assert.equal(img.width, 200, 'correct height');
        done();
      }, false);
      img.src = url;
    });
  });

  mocha.run();
});

