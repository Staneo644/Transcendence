import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { User } from '../user/user.entity';

export function verifyToken(token: string, authService: AuthService) {
  try {
    authService.getIdFromToken(token);
  } catch (error) {
    return false;
  }
  return true;
}

export function getKeys(map: Map<any, any>) {
  const list = [];
  map.forEach((key, value) => {
    list.push(value);
  });
  return list;
}

export function wrongtoken(client: Socket, canal: string) {
  client.emit('connection_error', { message: 'Invalid token', canal: canal });
}

export function send_connection_server(
  connected: Socket[],
  ingame: Map<string, string>,
  server: Server,
) {
  const connectedlist = [];
  connected.forEach((value) => {
    connectedlist.push(value.data.id);
  });
  const ingamelist = getKeys(ingame);
  const send = {
    connected: connectedlist,
    ingame: ingamelist,
  };
  server.emit('connection_server', send);
}

export function getIdFromSocket(
  socket: Socket,
  connected: Map<string, Socket>,
) {
  let ret = null;
  connected.forEach((value, key) => {
    if (value.id == socket.id) {
      ret = key;
    }
  });
  return ret;
}

export function getSocketFromId(id: string, connected: Socket[]): Socket {
  let ret = null;
  for (const socket of connected) {
    if (socket.data.id == id) {
      ret = socket;
    }
  }
  return ret;
}

export function includeUser(user: User, list: User[]) {
  let ret = false;
  list.forEach((value) => {
    if (value.id == user.id) {
      ret = true;
    }
  });
  return ret;
}


export function disconnect(id: any, clients: string[]): string[] {
  const ret: string[] = [];
  for (const c_id of clients) {
    if (c_id != id) {
      ret.push(c_id);
    }
  }
  return ret;
}

export function getSockets(server: Server): Socket[] {
  const ret: Socket[] = [];
  server.sockets.sockets.forEach((value) => {
    ret.push(value);
  });
  return ret;
}

export function getdualrequest(dual: Map<string, string>, id: string): string {
  let ret = null;
  dual.forEach((value, key) => {
    if (key == id) {
      ret = value;
    }
  });
  return ret;
}
