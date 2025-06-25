// File: lib/airtable.ts

import Airtable, { Base, FieldSet, Records } from 'airtable';

const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } = process.env;
if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  throw new Error(
	'Missing Airtable configuration: make sure AIRTABLE_API_KEY and AIRTABLE_BASE_ID are set'
  );
}

Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base: Base = Airtable.base(AIRTABLE_BASE_ID);
export default base;

// Optional: define the shape of your “zooms” table fields
export interface ZoomFields extends FieldSet {
  meetingId: string;
  topic: string;
  startTime: string;
  duration: number;
  joinUrl: string;
}
export type ZoomRecord = Records<ZoomFields>;
