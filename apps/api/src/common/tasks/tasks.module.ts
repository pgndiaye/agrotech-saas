import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TaskLockService } from './task-lock.service';

/** Global : toute tâche planifiée, quel que soit son module, doit pouvoir se verrouiller. */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [TaskLockService],
  exports: [TaskLockService],
})
export class TasksModule {}
