package com.dohatec.oms.datascraper.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

/**
 * Configuration for scheduled tasks
 * Enables @Scheduled annotation and configures scheduler thread pool
 */
@Slf4j
@Configuration
@EnableScheduling
public class SchedulerConfig implements SchedulingConfigurer {

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        
        scheduler.setPoolSize(5); // 5 concurrent scheduled tasks
        scheduler.setThreadNamePrefix("scraper-scheduler-");
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(60);
        scheduler.setRemoveOnCancelPolicy(true);
        
        scheduler.setErrorHandler(throwable -> 
            log.error("Scheduled task error: {}", throwable.getMessage(), throwable)
        );
        
        scheduler.initialize();
        
        taskRegistrar.setTaskScheduler(scheduler);
        
        log.info("Scheduler configured with pool size: 5");
    }
}

