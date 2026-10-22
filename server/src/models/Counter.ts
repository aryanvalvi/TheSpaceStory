import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter {
  _id: string;
  sequenceValue: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  sequenceValue: { type: Number, default: 0 },
});

export const Counter = mongoose.model<ICounter>('Counter', counterSchema);

/**
 * Atomically increments and returns the next sequence number for a given key.
 * This is concurrency-safe via findOneAndUpdate with $inc.
 */
export async function getNextSequence(key: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequenceValue;
}
