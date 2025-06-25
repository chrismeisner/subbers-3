// File: lib/airtable.ts

import Airtable, { Base } from 'airtable';

const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } = process.env;

// Ensure we actually have both values at startup
if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  throw new Error(
	'Missing Airtable configuration: make sure AIRTABLE_API_KEY and AIRTABLE_BASE_ID are set in your environment'
  );
}

// Configure the Airtable client
Airtable.configure({
  apiKey: AIRTABLE_API_KEY,
});

// Create a typed Base instance
const base: Base = Airtable.base(AIRTABLE_BASE_ID);

export default base;
