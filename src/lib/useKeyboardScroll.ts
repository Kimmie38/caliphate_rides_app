import { useEffect, useRef } from "react";
import { Keyboard, TextInput, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from "react-native";

/**
 * Scrolls the focused field into view when the keyboard opens.
 *
 * Android is always edge-to-edge now, so the window no longer resizes for the keyboard.
 * Wrap the screen in <KeyboardAvoidingView behavior="padding"> to shrink it, and spread
 * this onto the ScrollView inside so the field (plus `below` px, e.g. a button) ends up
 * above the keyboard.
 */
export function useKeyboardScroll(below = 16) {
  const ref = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      clearTimeout(timer);
      // Give KeyboardAvoidingView a moment to apply its padding before measuring.
      timer = setTimeout(() => {
        const input = TextInput.State.currentlyFocusedInput();
        const scroll = ref.current?.getNativeScrollRef();
        if (!input || !scroll) return;
        scroll.measureInWindow((_x, top, _w, height) => {
          input.measureInWindow((_ix, inputTop, _iw, inputHeight) => {
            const hidden = inputTop + inputHeight + below - (top + height);
            if (hidden > 0) ref.current?.scrollTo({ y: offset.current + hidden, animated: true });
          });
        });
      }, 120);
    });
    return () => { sub.remove(); clearTimeout(timer); };
  }, [below]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => { offset.current = e.nativeEvent.contentOffset.y; };
  return { ref, onScroll, scrollEventThrottle: 16 };
}
