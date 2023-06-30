import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface IdState {
	id: string | null;
}

const initialState: IdState = {
	id: null,
};

const conversationIdSlice = createSlice({
	name: 'id',
	initialState,
	reducers: {
		setChannelId: (state, action: PayloadAction<string | null>) => {
			state.id = action.payload;
		},
	},
});

export const {setChannelId} = conversationIdSlice.actions;

export default conversationIdSlice.reducer;
