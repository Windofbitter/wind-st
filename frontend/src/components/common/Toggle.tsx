import styles from "./Toggle.module.css";

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: React.ReactNode;
    disabled?: boolean;
    className?: string;
}

export function Toggle({
    checked,
    onChange,
    label,
    disabled = false,
    className = "",
}: ToggleProps) {
    return (
        <label
            className={`${styles.toggleLabel} ${disabled ? styles.disabled : ""} ${className}`}
        >
            <span style={{ position: "relative" }}>
                <input
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                />
                <div className={styles.toggleSwitch}>
                    <div className={styles.toggleKnob} />
                </div>
            </span>
            {label && <span className={styles.toggleText}>{label}</span>}
        </label>
    );
}
