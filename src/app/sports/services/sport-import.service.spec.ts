import { parseCsv } from './sport-import.service';

describe('parseCsv', () => {
  it('should read rows by header and keep quoted commas', () => {
    const rows = parseCsv(
      'name,description,iconUrl\nPadel,"Racket, court sport",\nCricket,,https://x.test/c.svg\n',
    );
    expect(rows).toEqual([
      { name: 'Padel', description: 'Racket, court sport', iconUrl: '' },
      { name: 'Cricket', description: '', iconUrl: 'https://x.test/c.svg' },
    ]);
  });
});
