import React, { useState, useEffect } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 7; // 60px for time column
const HOUR_HEIGHT = 60;

interface Task {
	id: string;
	title: string;
	date: string; // ISO date string: "2025-11-18"
	startHour: number;
	endHour: number;
	color: string;
}

interface CalendarComponentProps {
	events?: Task[];
	onAddButtonPress?: () => void;
	onEditEvent?: (task: Task) => void;
}

// Helper function to create a date string from current week
function getDateString(weekStart: Date, dayOffset: number): string {
	const date = new Date(weekStart);
	date.setDate(weekStart.getDate() + dayOffset);
	return date.toISOString().split('T')[0]; // "2025-11-18"
}

// Create default events for the current week
function getDefaultEventsForWeek(weekStart: Date): Task[] {
	return [
		{ id: '1', title: 'Team Meeting', date: getDateString(weekStart, 0), startHour: 9, endHour: 10, color: '#ff6b6b' },
		{ id: '2', title: 'Study Math', date: getDateString(weekStart, 1), startHour: 14, endHour: 16, color: '#4ecdc4' },
		{ id: '3', title: 'Project Work', date: getDateString(weekStart, 2), startHour: 10, endHour: 13, color: '#45b7d1' },
		{ id: '4', title: 'Gym', date: getDateString(weekStart, 3), startHour: 18, endHour: 19.5, color: '#96ceb4' },
		{ id: '5', title: 'Science Lab', date: getDateString(weekStart, 4), startHour: 13, endHour: 15, color: '#ffeaa7' },
	];
}

// Helper function to get Monday of a given week
function getMonday(date: Date) {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	return new Date(d.setDate(diff));
}

function CalendarComponent({ events, onAddButtonPress, onEditEvent }: CalendarComponentProps) {
	const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
	const [tasks, setTasks] = useState<Task[]>(events || getDefaultEventsForWeek(getMonday(new Date())));

	// Update tasks when events prop changes
	useEffect(() => {
		if (events) {
			setTasks(events);
		}
	}, [events]);

	// Calculate dynamic hour range based on events
	const getHourRange = () => {
		if (tasks.length === 0) {
			return { startHour: 8, endHour: 18 };
		}

		let earliestHour = 24;
		let latestHour = 0;

		tasks.forEach((task) => {
			// Safety check: skip tasks with invalid endHour
			if (task.endHour === undefined || isNaN(task.endHour)) {
				return;
			}
			
			const taskStartHour = Math.floor(task.startHour);
			const taskEndHour = Math.ceil(task.endHour);
			
			earliestHour = Math.min(earliestHour, taskStartHour);
			latestHour = Math.max(latestHour, taskEndHour);
		});

		// Safety check: if no valid tasks found, use default range
		if (latestHour === 0 || isNaN(latestHour)) {
			return { startHour: 8, endHour: 18 };
		}

		// Add 1-hour buffer before and after
		earliestHour = Math.max(0, earliestHour - 1);
		latestHour = Math.min(23, latestHour + 1);

		// Ensure minimum 8-hour range for better visibility
		const hourRange = latestHour - earliestHour;
		if (hourRange < 8) {
			// Expand to 8 hours, centering around the current range
			const expansion = Math.floor((8 - hourRange) / 2);
			earliestHour = Math.max(0, earliestHour - expansion);
			latestHour = Math.min(23, latestHour + expansion);
			
			// If still less than 8 hours due to bounds, adjust the other end
			if (latestHour - earliestHour < 8) {
				if (earliestHour === 0) {
					latestHour = Math.min(23, earliestHour + 8);
				} else {
					earliestHour = Math.max(0, latestHour - 8);
				}
			}
		}

		return { startHour: earliestHour, endHour: latestHour };
	};

	const { startHour, endHour } = getHourRange();
	const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);
	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	function formatDate(date: Date) {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getWeekDates() {
		const dates = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(currentWeekStart);
			date.setDate(currentWeekStart.getDate() + i);
			dates.push(date);
		}
		return dates;
	}

	function changeWeek(offset: number) {
		const newDate = new Date(currentWeekStart);
		newDate.setDate(currentWeekStart.getDate() + (offset * 7));
		setCurrentWeekStart(getMonday(newDate));
	}

	function formatHour(hour: number) {
		const wholeHour = Math.floor(hour);
		const minutes = Math.round((hour - wholeHour) * 60);
		
		let hourDisplay = wholeHour;
		let period = 'AM';
		
		if (wholeHour === 0) {
			hourDisplay = 12;
		} else if (wholeHour === 12) {
			period = 'PM';
		} else if (wholeHour > 12) {
			hourDisplay = wholeHour - 12;
			period = 'PM';
		}
		
		if (minutes === 0) {
			return `${hourDisplay} ${period}`;
		}
		return `${hourDisplay}:${minutes.toString().padStart(2, '0')} ${period}`;
	}

	const weekDates = getWeekDates();
	const isToday = (date: Date) => {
		const today = new Date();
		return date.toDateString() === today.toDateString();
	};

	return (
		<View style={styles.container}>
			{/* Header with week navigation */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => changeWeek(-1)} style={styles.navButton}>
					<Text style={styles.navButtonText}>←</Text>
				</TouchableOpacity>
				<Text style={styles.headerTitle}>
					{formatDate(weekDates[0])} - {formatDate(weekDates[6])}
				</Text>
				<TouchableOpacity onPress={() => changeWeek(1)} style={styles.navButton}>
					<Text style={styles.navButtonText}>→</Text>
				</TouchableOpacity>
			</View>

			{/* Day headers */}
			<View style={styles.dayHeaderRow}>
				<View style={styles.timeColumnHeader} />
				{days.map((day, index) => (
					<View
						key={day}
						style={[
							styles.dayHeader,
							isToday(weekDates[index]) && styles.todayHeader
						]}
					>
						<Text style={[
							styles.dayText,
							isToday(weekDates[index]) && styles.todayText
						]}>
							{day}
						</Text>
						<Text style={[
							styles.dateText,
							isToday(weekDates[index]) && styles.todayDateText
						]}>
							{weekDates[index].getDate()}
						</Text>
					</View>
				))}
			</View>

			{/* Calendar grid */}
			<ScrollView style={styles.scrollView}>
				<View style={styles.gridContainer}>
					{hours.map((hour) => (
						<View key={hour} style={styles.hourRow}>
							{/* Time label */}
							<View style={styles.timeColumn}>
								<Text style={styles.timeText}>{formatHour(hour)}</Text>
							</View>

							{/* Day columns */}
							{days.map((day, dayIndex) => {
								const columnDate = weekDates[dayIndex];
								const columnDateString = columnDate.toISOString().split('T')[0];
								
								return (
									<View key={`${hour}-${day}`} style={styles.dayColumn}>
										{/* Render tasks for this hour and day */}
										{tasks
											.filter(task => {
												const taskStartHour = Math.floor(task.startHour);
												// ✅ FIX: Compare actual dates, not just day-of-week!
												return task.date === columnDateString && taskStartHour === hour;
											})
											.map(task => {
											const taskStartHour = Math.floor(task.startHour);
											const startMinutes = (task.startHour - taskStartHour) * 60;
											const topOffset = startMinutes;
											const duration = task.endHour - task.startHour;
											
											return (
												<TouchableOpacity
													key={task.id}
													style={[
														styles.task,
														{
															backgroundColor: task.color,
															height: duration * HOUR_HEIGHT - 4,
															top: topOffset,
														},
													]}
													onLongPress={() => onEditEvent?.(task)}
													delayLongPress={500}
													activeOpacity={0.7}
												>
													<Text style={styles.taskTitle} numberOfLines={2}>
														{task.title}
													</Text>
													<Text style={styles.taskTime}>
														{formatHour(task.startHour)} - {formatHour(task.endHour)}
													</Text>
												</TouchableOpacity>
											);
										})}
									</View>
								);
							})}
						</View>
					))}
				</View>
			</ScrollView>

			{/* Add task button */}
			<TouchableOpacity style={styles.addButton} onPress={onAddButtonPress}>
				<Text style={styles.addButtonText}>+</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#25292e',
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
		fontSize: 18,
		fontWeight: '600',
	},
	navButton: {
		padding: 8,
	},
	navButtonText: {
		color: '#ffd33d',
		fontSize: 24,
		fontWeight: 'bold',
	},
	dayHeaderRow: {
		flexDirection: 'row',
		backgroundColor: '#1a1d21',
		borderBottomWidth: 2,
		borderBottomColor: '#ffd33d',
	},
	timeColumnHeader: {
		width: 60,
	},
	dayHeader: {
		width: COLUMN_WIDTH,
		alignItems: 'center',
		paddingVertical: 12,
		borderLeftWidth: 1,
		borderLeftColor: '#333',
	},
	todayHeader: {
		backgroundColor: '#ffd33d20',
	},
	dayText: {
		color: '#aaa',
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 4,
	},
	todayText: {
		color: '#ffd33d',
	},
	dateText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	todayDateText: {
		color: '#ffd33d',
	},
	scrollView: {
		flex: 1,
	},
	gridContainer: {
		flexDirection: 'column',
	},
	hourRow: {
		flexDirection: 'row',
		height: HOUR_HEIGHT,
		borderBottomWidth: 1,
		borderBottomColor: '#333',
	},
	timeColumn: {
		width: 60,
		alignItems: 'center',
		justifyContent: 'flex-start',
		paddingTop: 4,
	},
	timeText: {
		color: '#666',
		fontSize: 11,
		fontWeight: '500',
	},
	dayColumn: {
		width: COLUMN_WIDTH,
		borderLeftWidth: 1,
		borderLeftColor: '#333',
		position: 'relative',
	},
	task: {
		position: 'absolute',
		left: 2,
		right: 2,
		top: 2,
		borderRadius: 6,
		padding: 8,
		overflow: 'hidden',
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 3,
	},
	taskTitle: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 2,
	},
	taskTime: {
		color: '#fff',
		fontSize: 10,
		opacity: 0.9,
	},
	addButton: {
		position: 'absolute',
		bottom: 30,
		right: 30,
		backgroundColor: '#ffd33d',
		width: 60,
		height: 60,
		borderRadius: 30,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
	},
	addButtonText: {
		fontSize: 34,
		fontWeight: 'bold',
		color: '#25292e',
		marginTop: -2,
	},
});

export { CalendarComponent, Task };