import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { VariantId } from '@/engine/variants'
import type { WinnableWalk } from '@/engine/winnable'

// Where this device is in each rule set's list of winnable deals (engine/winnable.ts, dealt by stores/winnableDeals.ts):
// the list is walked in an order of the device's own (`order` seeds the shuffle) and `next` is how far along it is, so no deal
// comes round twice until the whole list has been dealt. The device's, not a player's: on a shared phone nobody gets a deal
// someone else already had. Its own key, so a store from before it starts at the beginning, and Reset Stats never touches it.
export type WinnableDealsState = Partial<Record<VariantId, WinnableWalk>>

const initialState: WinnableDealsState = {}

const slice = createSlice({
  name: 'winnableDeals',
  initialState,
  reducers: {
    dealt: (state, action: PayloadAction<{ variant: VariantId; walk: WinnableWalk }>) => {
      state[action.payload.variant] = action.payload.walk
    }
  }
})

export const winnableDealsActions = slice.actions
export default slice.reducer
