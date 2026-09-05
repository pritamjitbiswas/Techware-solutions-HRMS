export const colors = {
  paper: "#F7F8FB",
  white: "#FFFFFF",
  ink: "#1A1F36",
  inkLight: "#5B6178",
  inkSoft: "#8890A6",
  brand: "#5B5FEF",
  brandDark: "#4548C9",
  brandLight: "#EEEEFE",
  accent: "#F5A623",
  accentLight: "#FEF3E0",
  danger: "#E5484D",
  dangerLight: "#FDECEC",
  success: "#1CB877",
  successLight: "#E4F9EF",
  info: "#3B82F6",
  infoLight: "#EAF1FE",
  border: "#E2E5EC",
};

export const statusMeta: Record<string, { label: string; bg: string; fg: string }> = {
  present: { label: "Present", bg: colors.successLight, fg: colors.success },
  absent: { label: "Absent", bg: colors.dangerLight, fg: colors.danger },
  half_day: { label: "Half day", bg: colors.accentLight, fg: "#C77F1A" },
  on_leave: { label: "On leave", bg: colors.infoLight, fg: colors.info },
  holiday: { label: "Holiday", bg: colors.brandLight, fg: colors.brandDark },
  weekly_off: { label: "Weekly off", bg: colors.paper, fg: colors.inkLight },
  pending: { label: "Pending", bg: colors.accentLight, fg: "#C77F1A" },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };
