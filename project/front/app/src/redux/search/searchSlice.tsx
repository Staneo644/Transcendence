import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {IUser} from '../../components/utils/interface';

interface SearchState {
	users: Array<IUser> | null;
}

const initialState: SearchState = {
	users: null,
};

const searchSlice = createSlice({
	name: 'search',
	initialState,
	reducers: {
		setUsers: (state, action: PayloadAction<any>) => {
			state.users = action.payload;
		},
		addUser: (state, action: PayloadAction<any>) => {
			state.users?.push(action.payload);
		},
		setUsersNull: (state) => {
			state.users = null;
		},
	},
});

export const {setUsers, setUsersNull, addUser} = searchSlice.actions;

export default searchSlice.reducer;
