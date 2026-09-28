// The interactive widgets a content page can lead with: a page sets
// `tool: '<key>'` and ContentArticle renders the component above its blocks.
import { EmailVerifierTool } from '../pages/marketing/tools/EmailVerifierTool.jsx';
import { EmailFinderTool } from '../pages/marketing/tools/EmailFinderTool.jsx';

export const TOOLS = {
  'email-verifier': EmailVerifierTool,
  'email-finder': EmailFinderTool,
};
