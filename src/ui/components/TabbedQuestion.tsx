import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

interface TabbedQuestionProps {
  /** The question to display */
  question: string;
  /** Available options */
  options: string[];
  /** Called when user selects an option or types a custom answer */
  onAnswer: (answer: string) => void;
}

/**
 * Multi-choice question component with Tab/arrow navigation
 * and an "Other" option for free-text input.
 */
export function TabbedQuestion({ question, options, onAnswer }: TabbedQuestionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOther, setIsOther] = useState(false);
  const [otherText, setOtherText] = useState('');

  // All options plus "Other"
  const allOptions = [...options, 'Other'];

  useInput((input, key) => {
    if (isOther) {
      if (key.return) {
        onAnswer(otherText || options[0]);
        return;
      }
      if (key.escape) {
        setIsOther(false);
        return;
      }
      if (key.backspace || key.delete) {
        setOtherText(prev => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setOtherText(prev => prev + input);
      }
      return;
    }

    if (key.tab || key.downArrow) {
      setSelectedIndex(prev => (prev + 1) % allOptions.length);
    } else if (key.upArrow) {
      setSelectedIndex(prev => (prev - 1 + allOptions.length) % allOptions.length);
    } else if (key.return) {
      if (selectedIndex === options.length) {
        // "Other" selected
        setIsOther(true);
      } else {
        onAnswer(options[selectedIndex]);
      }
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="cyan">{question}</Text>
      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        {allOptions.map((option, idx) => (
          <Box key={idx}>
            <Text color={idx === selectedIndex ? 'green' : 'white'}>
              {idx === selectedIndex ? '> ' : '  '}{option}
            </Text>
          </Box>
        ))}
      </Box>
      {isOther && (
        <Box marginTop={1} marginLeft={2}>
          <Text color="yellow">Your answer: </Text>
          <Text>{otherText}</Text>
          <Text color="gray">█</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor color="gray">
          Tab/arrows to navigate, Enter to select{isOther ? ', Esc to go back' : ''}
        </Text>
      </Box>
    </Box>
  );
}
