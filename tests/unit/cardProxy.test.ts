import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import worker, { CARD_COPY_PROMPT, cardArtPrompt } from '../../public/_worker.js';
import { fallbackDraft } from '../../src/utils/fantasyCards';

afterEach(()=>vi.unstubAllGlobals());
it('桌面与浏览器文案及插画提示词一致',()=>{
  expect(CARD_COPY_PROMPT).toBe(readFileSync('src-tauri/src/ai/card-copy.txt','utf8').replace(/\r\n/g,'\n'));
  const native=readFileSync('src-tauri/src/ai/prompts.rs','utf8');
  const prompt=cardArtPrompt('A silver bookmark.');
  expect(prompt).toContain('64x64 pixel grid');expect(prompt).toContain('No people');
  expect(native).toContain(prompt.split('A silver bookmark.')[0]);
  expect(prompt).not.toContain('girl');expect(prompt).toContain('No grid lines');expect(prompt).toContain('NOT a photo or 3D render');
});
it('代理拒绝Q/K并传递专用响应和程序点数',async()=>{
  const copy={ordinary:fallbackDraft(['读书']),relationship:null};
  const upstream=vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(copy)}}]}),{status:200}));
  vi.stubGlobal('fetch',upstream);
  const request=(rank:string)=>new Request('https://example.test/api/cards/copy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({deviceId:'card-test-device-1234',sourceTasks:['读书'],rank})});
  const env={STEPFUN_API_KEY:'test-only'};
  expect((await worker.fetch(request('K'),env)).status).toBe(400);expect(upstream).not.toHaveBeenCalled();
  const response=await worker.fetch(request('7'),env);
  expect(await response.json()).toEqual(copy);
  const sent=JSON.parse(upstream.mock.calls[0][1].body);
  expect(sent.messages[1].content).toContain('普通牌点数：7');
});
