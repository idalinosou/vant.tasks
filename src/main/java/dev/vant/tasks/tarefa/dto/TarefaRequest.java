package dev.vant.tasks.tarefa.dto;

import dev.vant.tasks.tarefa.Prioridade;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record TarefaRequest(
        @NotBlank(message = "O título é obrigatório.")
        @Size(max = 120, message = "O título deve ter no máximo 120 caracteres.")
        String titulo,

        @Size(max = 500, message = "A descrição deve ter no máximo 500 caracteres.")
        String descricao,

        Prioridade prioridade,

        @FutureOrPresent(message = "O prazo não pode estar no passado.")
        LocalDate prazo) {
}
