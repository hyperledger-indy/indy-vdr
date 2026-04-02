import * as koffi from "koffi";
import {
  FFI_CALLBACK_ID,
  FFI_ERROR_CODE,
  FFI_STRING,
  FFI_VOID,
} from "./primitives";

export const FFI_CALLBACK_NO_RESULT = koffi.proto("cb_no_result", FFI_VOID, [
  FFI_CALLBACK_ID,
  FFI_ERROR_CODE,
]);

export const FFI_CALLBACK_STRING = koffi.proto("cb_string", FFI_VOID, [
  FFI_CALLBACK_ID,
  FFI_ERROR_CODE,
  FFI_STRING,
]);
