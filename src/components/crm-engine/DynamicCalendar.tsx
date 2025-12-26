'use client'

import React, { useMemo } from 'react'
import { useList } from '@refinedev/core'
import { Button, Spin } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Calendar, dayjsLocalizer, View as CalendarView } from 'react-big-calendar'
import dayjs from 'dayjs'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import type { DynamicCalendarProps, CalendarEvent } from './types'
import { getFieldValue, getDateValue, getRecordTitle, getSelectColor, getFieldByName } from './utils'

const localizer = dayjsLocalizer(dayjs)

/**
 * DynamicCalendar - Generic calendar component that renders based on configuration
 * 
 * This component is completely generic and works with any entity/view configuration.
 * It displays records as events on a calendar based on date fields.
 */
export function DynamicCalendar({ entity, view, config }: DynamicCalendarProps) {
    const [calendarView, setCalendarView] = React.useState<CalendarView>(
        (view.defaultView as CalendarView) || 'month'
    )
    const [date, setDate] = React.useState(new Date())

    // Fetch all records for this entity (Refine v6 API)
    const listResult = useList({
        resource: entity.tableName,
        pagination: {
            mode: 'off', // Load all records for calendar
        },
    })

    const data = listResult.query.data
    const isLoading = listResult.query.isLoading

    //Convert records to calendar events
    const events: CalendarEvent[] = useMemo(() => {
        if (!data?.data) return []

        return data.data
            .map((record: any) => {
                // Get start date
                const startDate = getDateValue(record, view.startDateField)
                if (!startDate) return null

                // Get end date (use startDate if not specified)
                const endDate = view.endDateField
                    ? getDateValue(record, view.endDateField) || startDate
                    : startDate

                // Get title
                const titleField = getFieldByName(entity, view.titleField)
                const title = titleField
                    ? String(getFieldValue(record, view.titleField) || 'Untitled')
                    : getRecordTitle(record, entity)

                // Get color (if configured)
                let color: string | undefined
                if (view.colorField) {
                    const colorFieldDef = getFieldByName(entity, view.colorField)
                    if (colorFieldDef) {
                        const colorValue = getFieldValue(record, view.colorField)
                        color = getSelectColor(colorValue, colorFieldDef)
                    }
                }

                return {
                    id: String(record.id),
                    title,
                    start: startDate,
                    end: endDate,
                    allDay: !view.endDateField, // All-day if no end date field
                    resource: record,
                    color,
                }
            })
            .filter(Boolean) as CalendarEvent[]
    }, [data, view, entity])

    const handleEventClick = (event: CalendarEvent) => {
        console.log('Event clicked:', event)
        // TODO: Open event details modal or navigate to detail page
    }

    const handleSlotClick = (slotInfo: { start: Date; end: Date }) => {
        if (!view.showCreate) return
        console.log('Create event at:', slotInfo)
        // TODO: Open create form with pre-filled date
    }

    const handleCreate = () => {
        console.log('Create new', entity.name)
        // TODO: Open create form
    }

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: 48 }}>
                <Spin size="large" />
            </div>
        )
    }

    return (
        <div className="dynamic-calendar">
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24
            }}>
                <div>
                    <h2 style={{ margin: 0 }}>{view.label}</h2>
                    {view.description && (
                        <p style={{ margin: '4px 0 0', color: '#666' }}>{view.description}</p>
                    )}
                </div>
                {view.showCreate && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreate}
                    >
                        Create {entity.label}
                    </Button>
                )}
            </div>

            {/* Calendar */}
            <div style={{ height: 600, backgroundColor: '#fff', padding: 16, borderRadius: 8 }}>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    view={calendarView}
                    onView={setCalendarView}
                    date={date}
                    onNavigate={setDate}
                    onSelectEvent={handleEventClick}
                    onSelectSlot={handleSlotClick}
                    selectable={view.showCreate}
                    eventPropGetter={(event) => ({
                        style: {
                            backgroundColor: event.color || '#3174ad',
                            borderRadius: 4,
                            opacity: 0.9,
                            border: 'none',
                            display: 'block',
                        },
                    })}
                    style={{ height: '100%' }}
                />
            </div>
        </div>
    )
}
