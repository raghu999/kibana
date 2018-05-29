import { socketInterpreterProvider } from '../../common/interpreter/socket_interpret';
import { serializeProvider } from '../../common/lib/serialize';
import { socket } from '../socket';
import { typesRegistry } from '../../common/lib/types_registry';
import { createHandlers } from './create_handlers';
import { functionsRegistry } from './functions_registry';

// Create the function list
socket.emit('getFunctionList');
export const getServerFunctions = new Promise(resolve => socket.once('functionList', resolve));

// Use the above promise to seed the interpreter with the functions it can defer to
export function interpretAst(ast, context) {
  return getServerFunctions
    .then(serverFunctionList => {
      return socketInterpreterProvider({
        types: typesRegistry.toJS(),
        handlers: createHandlers(socket),
        functions: functionsRegistry.toJS(),
        referableFunctions: serverFunctionList,
        socket: socket,
      });
    })
    .then(interpretFn => interpretFn(ast, context));
}

socket.on('run', ({ ast, context, id }) => {
  const types = typesRegistry.toJS();
  const { serialize, deserialize } = serializeProvider(types);
  interpretAst(ast, deserialize(context)).then(value => {
    socket.emit(`resp:${id}`, { value: serialize(value) });
  });
});
