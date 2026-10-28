export const name = {
  title: 'What should I call you?',
  lead: 'This is how I greet you and know who you are at home. You can change it any time in You.',
  name: 'First name',
  'last-name': 'Last name · optional',
  privacy: 'Your name stays on your Argus, in your home.',
  save: 'Continue',
  errors: {
    required: 'Type your name.',
    long: 'Use a shorter name.',
    letters: 'Use only letters, spaces, apostrophes, hyphens and periods.',
    'save-failed': 'I could not save your name. Check the connection and try again.',
  },
} as const;
