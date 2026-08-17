import { Client } from '@elastic/elasticsearch';
import { env } from './env.js';

export const es = new Client({ node: env.ELASTICSEARCH_URL });
