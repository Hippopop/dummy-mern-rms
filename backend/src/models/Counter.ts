import { Schema, model, type Model } from 'mongoose';

export interface ICounter {
  key: string;
  sequence: number;
}

interface CounterModel extends Model<ICounter> {
  formatted(prefix: string, key: string): Promise<string>;
}

const counterSchema = new Schema<ICounter, CounterModel>(
  { key: { type: String, required: true, unique: true }, sequence: { type: Number, default: 0 } },
  { versionKey: false },
);

counterSchema.statics.formatted = async function (prefix: string, key: string): Promise<string> {
  const doc = await this.findOneAndUpdate(
    { key },
    { $inc: { sequence: 1 } },
    { returnDocument: 'after', upsert: true },
  ).lean<ICounter>();
  const [, datePart] = key.split(':');
  return `${prefix}-${datePart}-${String(doc!.sequence).padStart(4, '0')}`;
};

export const Counter = model<ICounter, CounterModel>('Counter', counterSchema);
