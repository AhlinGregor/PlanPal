import React, { useState } from 'react';
import {
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	Dimensions,
	Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ColorPicker, { Panel1, HueSlider } from 'reanimated-color-picker';

interface Task {
	id: string;
	title: string;
	date: string; // ISO date string: "2025-11-18"
	startHour: number;
	endHour: number;
	color: string;
}

interface CreateEventComponentProps {
	visible: boolean;
	onClose: () => void;
	onCreateEvent: (event: Task) => void;
}

const COLORS = [
	'#f44336', // Red
	'#2196f3', // Blue
	'#4caf50', // Green
	'#ff9800', // Orange
	'#9c27b0', // Purple
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function CreateEventComponent({
	visible,
	onClose,
	onCreateEvent,
}: CreateEventComponentProps) {
	const [title, setTitle] = useState('');
	const [selectedStartDateTime, setSelectedStartDateTime] = useState(new Date());
	const [showStartDateTimePicker, setShowStartDateTimePicker] = useState(false);
	const [startPickerMode, setStartPickerMode] = useState<'date' | 'time'>('date');
	const [selectedEndDateTime, setSelectedEndDateTime] = useState(() => {
		const endTime = new Date();
		endTime.setHours(endTime.getHours() + 1); // Default 1 hour duration
		return endTime;
	});
	const [showEndDateTimePicker, setShowEndDateTimePicker] = useState(false);
	const [endPickerMode, setEndPickerMode] = useState<'date' | 'time'>('date');
	const [selectedColor, setSelectedColor] = useState('#f44336');
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [showColorWheel, setShowColorWheel] = useState(false);
	const [tempColor, setTempColor] = useState('#f44336');

	const handleCreate = () => {
		if (!title.trim()) {
			alert('Please enter an event title');
			return;
		}

		// Validate that end datetime is after start datetime
		if (selectedEndDateTime <= selectedStartDateTime) {
			alert('End date/time must be after start date/time');
			return;
		}

		// Get ISO date string from start date
		const dateString = selectedStartDateTime.toISOString().split('T')[0];

		const startHour = selectedStartDateTime.getHours() + (selectedStartDateTime.getMinutes() / 60);
		const endHour = selectedEndDateTime.getHours() + (selectedEndDateTime.getMinutes() / 60);

		const newEvent: Task = {
			id: Date.now().toString(),
			title: title.trim(),
			date: dateString,
			startHour: startHour,
			endHour: endHour,
			color: selectedColor,
		};

		onCreateEvent(newEvent);
		resetForm();
		onClose();
	};

	const resetForm = () => {
		setTitle('');
		setSelectedStartDateTime(new Date());
		const endTime = new Date();
		endTime.setHours(endTime.getHours() + 1);
		setSelectedEndDateTime(endTime);
		setSelectedColor('#f44336');
	};

	const onStartDateChange = (event: any, date?: Date) => {
		if (Platform.OS === 'android') {
			if (startPickerMode === 'date' && date) {
				// After selecting date on Android, show time picker
				const newDateTime = new Date(date);
				newDateTime.setHours(selectedStartDateTime.getHours(), selectedStartDateTime.getMinutes(), 0, 0);
				setSelectedStartDateTime(newDateTime);
				setStartPickerMode('time');
				setShowStartDateTimePicker(true);
			} else if (startPickerMode === 'time' && date) {
				// After selecting time on Android, close picker
				const newDateTime = new Date(selectedStartDateTime);
				newDateTime.setHours(date.getHours(), date.getMinutes(), 0, 0);
				setSelectedStartDateTime(newDateTime);
				setShowStartDateTimePicker(false);
				setStartPickerMode('date'); // Reset for next time
			}
		} else {
			// iOS behavior
			setShowStartDateTimePicker(true);
			if (date) {
				if (startPickerMode === 'date') {
					const newDateTime = new Date(date);
					newDateTime.setHours(selectedStartDateTime.getHours(), selectedStartDateTime.getMinutes(), 0, 0);
					setSelectedStartDateTime(newDateTime);
				} else {
					const newDateTime = new Date(selectedStartDateTime);
					newDateTime.setHours(date.getHours(), date.getMinutes(), 0, 0);
					setSelectedStartDateTime(newDateTime);
				}
			}
		}
	};

	const onEndDateChange = (event: any, date?: Date) => {
		if (Platform.OS === 'android') {
			if (endPickerMode === 'date' && date) {
				// After selecting date on Android, show time picker
				const newDateTime = new Date(date);
				newDateTime.setHours(selectedEndDateTime.getHours(), selectedEndDateTime.getMinutes(), 0, 0);
				setSelectedEndDateTime(newDateTime);
				setEndPickerMode('time');
				setShowEndDateTimePicker(true);
			} else if (endPickerMode === 'time' && date) {
				// After selecting time on Android, close picker
				const newDateTime = new Date(selectedEndDateTime);
				newDateTime.setHours(date.getHours(), date.getMinutes(), 0, 0);
				setSelectedEndDateTime(newDateTime);
				setShowEndDateTimePicker(false);
				setEndPickerMode('date'); // Reset for next time
			}
		} else {
			// iOS behavior
			setShowEndDateTimePicker(true);
			if (date) {
				if (endPickerMode === 'date') {
					const newDateTime = new Date(date);
					newDateTime.setHours(selectedEndDateTime.getHours(), selectedEndDateTime.getMinutes(), 0, 0);
					setSelectedEndDateTime(newDateTime);
				} else {
					const newDateTime = new Date(selectedEndDateTime);
					newDateTime.setHours(date.getHours(), date.getMinutes(), 0, 0);
					setSelectedEndDateTime(newDateTime);
				}
			}
		}
	};

	const formatSelectedStartDate = () => {
		return selectedStartDateTime.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	const formatSelectedStartTime = () => {
		return selectedStartDateTime.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});
	};

	const formatSelectedEndDate = () => {
		return selectedEndDateTime.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	const formatSelectedEndTime = () => {
		return selectedEndDateTime.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={false}
			onRequestClose={onClose}
		>
			<View style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity onPress={onClose}>
						<Text style={styles.closeButton}>✕</Text>
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Create Event</Text>
					<View style={{ width: 30 }} />
				</View>

				<ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
					{/* Title Input */}
					<View style={styles.section}>
						<Text style={styles.label}>Event Title</Text>
						<TextInput
							style={styles.input}
							placeholder="Enter event title"
							placeholderTextColor="#666"
							value={title}
							onChangeText={setTitle}
						/>
					</View>

					{/* Start DateTime Selection */}
					<View style={styles.section}>
						<Text style={styles.label}>Start Date & Time</Text>
						<TouchableOpacity
							style={styles.dateButton}
							onPress={() => {
								setStartPickerMode('date');
								setShowStartDateTimePicker(true);
							}}
						>
							<Text style={styles.dateButtonText}>
								{formatSelectedStartDate()} at {formatSelectedStartTime()}
							</Text>
						</TouchableOpacity>
						{showStartDateTimePicker && (
							<DateTimePicker
								value={selectedStartDateTime}
								mode={startPickerMode}
								is24Hour={false}
								display={Platform.OS === 'android' ? 'default' : 'spinner'}
								onChange={onStartDateChange}
							/>
						)}
					</View>

					{/* End DateTime Selection */}
					<View style={styles.section}>
						<Text style={styles.label}>End Date & Time</Text>
						<TouchableOpacity
							style={styles.dateButton}
							onPress={() => {
								setEndPickerMode('date');
								setShowEndDateTimePicker(true);
							}}
						>
							<Text style={styles.dateButtonText}>
								{formatSelectedEndDate()} at {formatSelectedEndTime()}
							</Text>
						</TouchableOpacity>
						{showEndDateTimePicker && (
							<DateTimePicker
								value={selectedEndDateTime}
								mode={endPickerMode}
								is24Hour={false}
								display={Platform.OS === 'android' ? 'default' : 'spinner'}
								onChange={onEndDateChange}
							/>
						)}
					</View>

					{/* Color Selection */}
					<View style={styles.section}>
						<Text style={styles.label}>Color</Text>
						<View style={styles.presetColorsContainer}>
							{COLORS.map((color, index) => (
								<TouchableOpacity
									key={index}
									style={[
										styles.presetColorButton,
										{ backgroundColor: color },
										selectedColor === color && styles.presetColorSelected,
									]}
									onPress={() => setSelectedColor(color)}
								>
									{selectedColor === color && (
										<Text style={styles.presetColorCheck}>✓</Text>
									)}
								</TouchableOpacity>
							))}
							<TouchableOpacity
								style={[
									styles.customColorButton,
									{ 
										backgroundColor: selectedColor,
										borderColor: COLORS.includes(selectedColor) ? '#ffd33d' : '#fff'
									},
								]}
								onPress={() => {
									setTempColor(selectedColor);
									setShowColorWheel(true);
								}}
							>
								<Text style={styles.customColorText}>🎨</Text>
							</TouchableOpacity>
						</View>
						<Text style={styles.colorHint}>Tap 🎨 to pick any color</Text>
					</View>
				</ScrollView>

				{/* Color Wheel Modal */}
				<Modal
					visible={showColorWheel}
					animationType="slide"
					transparent={true}
					onRequestClose={() => setShowColorWheel(false)}
				>
					<View style={styles.colorPickerOverlay}>
						<View style={styles.colorPickerContainer}>
							<View style={styles.colorPickerHeader}>
								<Text style={styles.colorPickerTitle}>Pick Custom Color</Text>
								<TouchableOpacity onPress={() => setShowColorWheel(false)}>
									<Text style={styles.colorPickerClose}>✕</Text>
								</TouchableOpacity>
							</View>
							
							<ColorPicker
								style={styles.colorWheel}
								value={tempColor}
								sliderThickness={25}
								thumbSize={30}
								thumbShape="circle"
								onChangeJS={({ hex }) => {
									// Use onChangeJS instead of onChange to avoid reanimated crashes
									const hexColor = hex.startsWith('#') ? hex : `#${hex}`;
									setTempColor(hexColor);
								}}
							>
								<Panel1 style={styles.panel} />
								<HueSlider style={styles.hueSlider} />
							</ColorPicker>

							<View style={styles.colorWheelButtons}>
								<TouchableOpacity
									style={styles.colorWheelCancelButton}
									onPress={() => setShowColorWheel(false)}
								>
									<Text style={styles.colorWheelCancelText}>Cancel</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.colorWheelButton}
									onPress={() => {
										setSelectedColor(tempColor);
										setShowColorWheel(false);
									}}
								>
									<Text style={styles.colorWheelButtonText}>Apply</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</Modal>

				{/* Action Buttons */}
				<View style={styles.footer}>
					<TouchableOpacity
						style={[styles.button, styles.cancelButton]}
						onPress={() => {
							resetForm();
							onClose();
						}}
					>
						<Text style={styles.cancelButtonText}>Cancel</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.button, styles.createButton]} onPress={handleCreate}>
						<Text style={styles.createButtonText}>Create Event</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#25292e',
		paddingTop: 40,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: '#1a1d21',
		borderBottomWidth: 1,
		borderBottomColor: '#333',
	},
	headerTitle: {
		color: '#fff',
		fontSize: 20,
		fontWeight: '600',
	},
	closeButton: {
		color: '#ffd33d',
		fontSize: 28,
		fontWeight: 'bold',
		width: 30,
		textAlign: 'center',
	},
	form: {
		flex: 1,
		paddingHorizontal: 20,
		paddingVertical: 20,
	},
	section: {
		marginBottom: 24,
	},
	label: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 10,
	},
	input: {
		backgroundColor: '#333',
		borderWidth: 1,
		borderColor: '#444',
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
		color: '#fff',
		fontSize: 16,
	},
	dateButton: {
		backgroundColor: '#333',
		borderWidth: 1,
		borderColor: '#444',
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	dateButtonText: {
		color: '#fff',
		fontSize: 16,
	},
	presetColorsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
	},
	presetColorButton: {
		width: 55,
		height: 55,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: 'transparent',
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 3,
	},
	presetColorSelected: {
		borderColor: '#ffd33d',
		borderWidth: 4,
		elevation: 5,
	},
	presetColorCheck: {
		color: '#fff',
		fontSize: 28,
		fontWeight: 'bold',
		textShadowColor: '#000',
		textShadowOffset: { width: 2, height: 2 },
		textShadowRadius: 4,
	},
	customColorButton: {
		width: 55,
		height: 55,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: '#ffd33d',
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 3,
	},
	customColorText: {
		fontSize: 32,
	},
	colorHint: {
		color: '#999',
		fontSize: 12,
		marginTop: 8,
		fontStyle: 'italic',
	},
	colorPickerOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	colorPickerContainer: {
		backgroundColor: '#25292e',
		borderRadius: 20,
		width: '100%',
		maxWidth: 400,
		padding: 24,
		borderWidth: 2,
		borderColor: '#ffd33d',
	},
	colorPickerHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 24,
	},
	colorPickerTitle: {
		color: '#fff',
		fontSize: 22,
		fontWeight: '600',
	},
	colorPickerClose: {
		color: '#ffd33d',
		fontSize: 32,
		fontWeight: 'bold',
	},
	colorWheel: {
		width: '100%',
	},
	panel: {
		borderRadius: 16,
		marginBottom: 20,
		height: 250,
	},
	hueSlider: {
		borderRadius: 20,
		height: 40,
	},
	colorWheelButtons: {
		flexDirection: 'row',
		marginTop: 20,
		gap: 12,
	},
	colorWheelCancelButton: {
		flex: 1,
		backgroundColor: '#333',
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#666',
	},
	colorWheelCancelText: {
		color: '#aaa',
		fontSize: 18,
		fontWeight: '600',
	},
	colorWheelButton: {
		flex: 1,
		backgroundColor: '#ffd33d',
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: 'center',
	},
	colorWheelButtonText: {
		color: '#25292e',
		fontSize: 18,
		fontWeight: '600',
	},
	footer: {
		flexDirection: 'row',
		gap: 12,
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: '#1a1d21',
		borderTopWidth: 1,
		borderTopColor: '#333',
	},
	button: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cancelButton: {
		backgroundColor: '#333',
		borderWidth: 1,
		borderColor: '#444',
	},
	cancelButtonText: {
		color: '#aaa',
		fontSize: 16,
		fontWeight: '600',
	},
	createButton: {
		backgroundColor: '#ffd33d',
	},
	createButtonText: {
		color: '#25292e',
		fontSize: 16,
		fontWeight: '600',
	},
});

export { Task };
