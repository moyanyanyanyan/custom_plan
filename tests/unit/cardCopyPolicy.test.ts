import { describe, expect, it, vi } from 'vitest';
import { generateCardCopy, parseCardCopy, validateCardName } from '../../public/card-copy-policy.js';

describe('card copy policy', () => {
  it('校验长度、字符、禁用称号和发明物结尾', () => {
    expect(validateCardName('桌面秩序压缩机')).toBeNull();
    expect(validateCardName('短小机')).toContain('5-12');
    expect(validateCardName('这个名字实在是非常非常漫长的处理装置')).toContain('5-12');
    expect(validateCardName('代码Bug处理器')).toContain('只能包含汉字');
    expect(validateCardName('代码大师处理器')).toContain('大师');
    expect(validateCardName('桌面秩序维护员')).toContain('结尾');
    expect(validateCardName('')).toContain('为空');
  });

  it('解析完整文案并拒绝空描述', () => {
    expect(parseCardCopy('{"name":"凌晨代码驯服箱","description":"有效描述","scene":"at a desk"}').copy?.name)
      .toBe('凌晨代码驯服箱');
    expect(parseCardCopy('{"name":"凌晨代码驯服箱","description":""}').reason).toContain('描述');
  });

  it('首次不合规时携带原因重试且只重试一次', async () => {
    const repaired = vi.fn()
      .mockResolvedValueOnce('{"name":"代码大师","description":"错误"}')
      .mockResolvedValueOnce('{"name":"凌晨代码驯服箱","description":"修复完成"}');
    await expect(generateCardCopy(repaired, ['修复代码'])).resolves.toMatchObject({ name: '凌晨代码驯服箱' });
    expect(repaired).toHaveBeenCalledTimes(2);
    expect(repaired.mock.calls[1][0]).toContain('上一次输出不合规');

    const invalid = vi.fn().mockResolvedValue('not json');
    await expect(generateCardCopy(invalid, ['修复代码'])).rejects.toThrow('INVALID_UPSTREAM_RESPONSE');
    expect(invalid).toHaveBeenCalledTimes(2);
  });
});
