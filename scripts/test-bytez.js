import Bytez from 'bytez.js';

(async () => {
  try {
    const key = process.env.VITE_BYTEZ_API_KEY || '2622dd06541127bea7641c3ad0ed8859';
    console.log('Using key prefix:', key.slice(0,8) + '...');
    const sdk = new Bytez(key);
    const model = sdk.model('Qwen/Qwen3-0.6B');
    console.log('Sending test prompt to Qwen/Qwen3-0.6B...');
    const { error, output } = await model.run([{ role: 'user', content: 'Hello' }]);
    console.log('Result:');
    console.log({ error, output });
  } catch (err) {
    console.error('Test failed:', err instanceof Error ? err.message : err);
    process.exit(2);
  }
})();
