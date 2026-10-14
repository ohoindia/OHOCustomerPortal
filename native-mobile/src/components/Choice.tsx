import { Text, Pressable, View } from "react-native";
import { s, colors } from "./ui";
import { translate } from "../lib/localization";
export function Choice({
  label,
  options,
  selected,
  onSelect,
  disabled,
}: {
  label: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.label}>{translate(label)}</Text>
      <View style={s.grid}>
        {options.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === option, disabled }}
            disabled={disabled}
            onPress={() => onSelect(option)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: selected === option ? colors.brand : colors.line,
              backgroundColor: selected === option ? "#e0f2fe" : "#fff",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                color: selected === option ? colors.brand : colors.navy,
              }}
            >
              {translate(option)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
