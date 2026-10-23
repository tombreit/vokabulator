// @ts-check
/**
 * The one error type of all importers: its message is shown to the learner as it is,
 * so it is German, friendly and says what to do. Anything else that goes wrong while
 * importing is a bug or a broken file – importers catch it and throw an ImportError instead.
 */
export class ImportError extends Error {}
