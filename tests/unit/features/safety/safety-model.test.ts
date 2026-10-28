import { describe, expect, test } from 'bun:test';
import { panicResultSchema, safetyStatusSchema } from '@/core/contracts/safety.contract';
import { localeDictionaries } from '@/core/locales/all';
import { translate } from '@/core/i18n/translate';
import {
  ENABLE_REACH_WARNING_COPY,
  digitsOnly,
  enableReachWarning,
  holdComplete,
  holdProgress,
  phraseProblem,
  phraseWords,
  pinDraftProblem,
  reachNotice,
  trivialPin,
} from '@/features/safety/model/safety';

const REACH_WORDS = {
  es: {
    contacts: 'contactos de emergencia',
    household: 'casa',
    panic: 'pánico',
    duress: 'coacción',
    noContact: 'ni contactos de emergencia',
  },
  en: {
    contacts: 'emergency contacts',
    household: 'household',
    panic: 'panic',
    duress: 'duress',
    noContact: 'no emergency contact',
  },
} as const;

describe('the warning before turning duress on, in es and en', () => {
  for (const language of ['es', 'en'] as const) {
    const dictionary = localeDictionaries[language];
    const words = REACH_WORDS[language];

    test(`${language}: on contacts it says a panic reaches the contacts and a duress alert only the household`, () => {
      const title = translate(dictionary, ENABLE_REACH_WARNING_COPY.contacts.title);
      const description = translate(dictionary, ENABLE_REACH_WARNING_COPY.contacts.description);
      expect(title.toLowerCase()).toContain(words.duress);
      for (const word of [words.panic, words.contacts, words.duress, words.household]) {
        expect(description.toLowerCase()).toContain(word);
      }
      const notice = translate(dictionary, 'screens.safety.reach.contacts').toLowerCase();
      for (const word of [words.panic, words.contacts, words.duress, words.household]) {
        expect(notice).toContain(word);
      }
    });

    test(`${language}: on nobody it keeps its own warning, with no contact to fall back on`, () => {
      const title = translate(dictionary, ENABLE_REACH_WARNING_COPY.nobody.title);
      const description = translate(dictionary, ENABLE_REACH_WARNING_COPY.nobody.description);
      expect(title).not.toBe(translate(dictionary, ENABLE_REACH_WARNING_COPY.contacts.title));
      expect(description).not.toBe(translate(dictionary, ENABLE_REACH_WARNING_COPY.contacts.description));
      expect(description.toLowerCase()).toContain(words.noContact);
      expect(description.toLowerCase()).not.toContain(words.panic);
    });
  }
});

describe('PIN drafts', () => {
  test('both codes are 4 to 8 digits and different', () => {
    expect(pinDraftProblem('4719', '8352')).toBeNull();
    expect(pinDraftProblem('471', '8352')).toBe('disarm-format');
    expect(pinDraftProblem('4719', '83a2')).toBe('duress-format');
    expect(pinDraftProblem('4719', '4719')).toBe('same');
    expect(pinDraftProblem('471952683', '8352')).toBe('disarm-format');
  });

  test('codes the server refuses as trivial are caught before sending', () => {
    expect(pinDraftProblem('1234', '8352')).toBe('disarm-trivial');
    expect(pinDraftProblem('4719', '7777')).toBe('duress-trivial');
    for (const pin of ['1111', '1234', '4321', '7890', '0987', '9012', '2109', '1212', '123123', '45674567']) {
      expect(trivialPin(pin)).toBe(true);
    }
    for (const pin of ['4719', '1243', '8352', '135792', '13579']) {
      expect(trivialPin(pin)).toBe(false);
    }
  });

  test('typing keeps digits only, at most eight', () => {
    expect(digitsOnly('12-34 56')).toBe('123456');
    expect(digitsOnly('1234567890')).toBe('12345678');
  });
});

describe('hold to trigger', () => {
  test('progress runs over the hold and completes only at its end', () => {
    expect(holdProgress(null, 5000)).toBe(0);
    expect(holdProgress(1000, 2000, 2000)).toBe(0.5);
    expect(holdComplete(1000, 2999, 2000)).toBe(false);
    expect(holdComplete(1000, 3000, 2000)).toBe(true);
    expect(holdProgress(1000, 9000, 2000)).toBe(1);
  });
});

describe('safety contracts', () => {
  test('read the guard answers', () => {
    expect(safetyStatusSchema.safeParse({ duressEnabled: true, hasPin: false }).success).toBe(true);
    expect(safetyStatusSchema.safeParse({ duressEnabled: 'yes', hasPin: false }).success).toBe(false);
    expect(panicResultSchema.safeParse({ alertId: 4, sent: true, repeated: false }).success).toBe(true);
    expect(panicResultSchema.safeParse({ alertId: 0, sent: true, repeated: false }).success).toBe(false);
  });
});

describe('the duress phrase draft', () => {
  test('a phrase is 3 to 12 words, as the server counts them', () => {
    expect(phraseProblem('la lluvia de abril trae flores')).toBeNull();
    expect(phraseProblem('rojo, verde; azul!')).toBeNull();
    expect(phraseWords('  Señor   Ñandú, ¿qué tal?  ')).toEqual(['Señor', 'Ñandú', 'qué', 'tal']);
    expect(phraseProblem('dos palabras')).toBe('words');
    expect(phraseProblem('   ')).toBe('words');
    expect(phraseProblem(Array.from({ length: 13 }, () => 'palabra').join(' '))).toBe('words');
  });

  test('digits, control characters and more than 200 bytes are refused before sending', () => {
    expect(phraseProblem('tengo 3 gatos negros')).toBe('digits');
    expect(phraseProblem('rojo verde\nazul')).toBe('characters');
    expect(phraseProblem(Array.from({ length: 12 }, () => 'ñandúñandúñandú').join(' '))).toBe('long');
  });
});

describe('who an alert would reach', () => {
  test('nobody, only the contacts and an unknown answer are said; others needs no word', () => {
    expect(reachNotice('nobody')).toBe('nobody');
    expect(reachNotice('contacts')).toBe('contacts');
    expect(reachNotice('unknown')).toBe('unknown');
    expect(reachNotice('others')).toBeNull();
    expect(reachNotice(null)).toBeNull();
  });

  test('turning duress on warns first when a duress alert would reach nobody: on nobody and on contacts', () => {
    expect(enableReachWarning('nobody')).toBe('nobody');
    expect(enableReachWarning('contacts')).toBe('contacts');
    expect(enableReachWarning('others')).toBeNull();
    expect(enableReachWarning('unknown')).toBeNull();
    expect(enableReachWarning(null)).toBeNull();
  });

  test('the status reads hasPhrase and alertsReach, and an older server without them claims nothing', () => {
    expect(
      safetyStatusSchema.parse({ duressEnabled: true, hasPin: true, hasPhrase: true, alertsReach: 'nobody' })
    ).toEqual({ duressEnabled: true, hasPin: true, hasPhrase: true, alertsReach: 'nobody', maskedCameras: [] });
    expect(safetyStatusSchema.parse({ duressEnabled: true, hasPin: false })).toEqual({
      duressEnabled: true,
      hasPin: false,
      hasPhrase: false,
      alertsReach: null,
      maskedCameras: [],
    });
    expect(safetyStatusSchema.parse({ duressEnabled: true, hasPin: false, alertsReach: 'family' }).alertsReach).toBe(
      'unknown'
    );
  });

  test('a status never carries a phrase, even if an answer echoed one', () => {
    const status = safetyStatusSchema.parse({
      duressEnabled: true,
      hasPin: true,
      hasPhrase: true,
      alertsReach: 'others',
      duressPhrase: 'rojo verde azul',
    });
    expect(Object.keys(status).sort()).toEqual(['alertsReach', 'duressEnabled', 'hasPhrase', 'hasPin', 'maskedCameras']);
    expect(JSON.stringify(status)).not.toContain('rojo verde azul');
  });
});

