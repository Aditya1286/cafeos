import mongoose, { Schema, Document } from 'mongoose';

// What the kitchen bot will do to one live demo order, and when: accept it, start cooking, mark it
// ready, complete it — or have the customer cancel it. Each step is carried out through the
// normal order API once its time has come (see ../live.ts).
export type DemoPlanAction = 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'CUSTOMER_CANCEL' | 'CUSTOMER_MARK_PAID';

export interface IDemoPlanStep {
  action: DemoPlanAction;
  at: Date;
}

export interface IDemoOrderPlan extends Document {
  _id: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  steps: IDemoPlanStep[];
  next: number; // index of the next step to carry out
  nextAt?: Date; // when that step is due; unset once done
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DemoOrderPlanSchema = new Schema<IDemoOrderPlan>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    steps: [
      {
        _id: false,
        action: { type: String, required: true },
        at: { type: Date, required: true }
      }
    ],
    next: { type: Number, default: 0 },
    nextAt: { type: Date },
    done: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Every tick asks for the plans with a step now due.
DemoOrderPlanSchema.index({ done: 1, nextAt: 1 });

export const DemoOrderPlan = mongoose.model<IDemoOrderPlan>('DemoOrderPlan', DemoOrderPlanSchema);
