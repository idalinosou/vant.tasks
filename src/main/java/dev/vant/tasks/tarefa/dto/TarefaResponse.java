package dev.vant.tasks.tarefa.dto;

import dev.vant.tasks.tarefa.Prioridade;
import dev.vant.tasks.tarefa.StatusTarefa;
import dev.vant.tasks.tarefa.Tarefa;

import java.time.Instant;
import java.time.LocalDate;

public record TarefaResponse(
        Long id,
        String titulo,
        String descricao,
        Prioridade prioridade,
        StatusTarefa status,
        LocalDate prazo,
        Instant criadaEm,
        Instant concluidaEm) {

    public static TarefaResponse de(Tarefa tarefa) {
        return new TarefaResponse(
                tarefa.getId(),
                tarefa.getTitulo(),
                tarefa.getDescricao(),
                tarefa.getPrioridade(),
                tarefa.getStatus(),
                tarefa.getPrazo(),
                tarefa.getCriadaEm(),
                tarefa.getConcluidaEm());
    }
}
