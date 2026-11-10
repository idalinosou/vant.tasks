package dev.vant.tasks.tarefa;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;

@Component
@Profile("!test")
public class DadosIniciais implements CommandLineRunner {

    private final TarefaRepository repositorio;

    public DadosIniciais(TarefaRepository repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    public void run(String... args) {
        if (repositorio.count() > 0) {
            return;
        }

        repositorio.save(criar("Estudar Spring Boot", "Controllers, services e repositories.", Prioridade.ALTA, LocalDate.now().plusDays(7)));
        repositorio.save(criar("Revisar JPA", "Relacionamentos e consultas com Specification.", Prioridade.MEDIA, LocalDate.now().plusDays(10)));

        Tarefa concluida = criar("Publicar o portfólio", "Site no GitHub Pages com identidade vant.", Prioridade.MEDIA, null);
        concluida.setStatus(StatusTarefa.CONCLUIDA);
        concluida.setConcluidaEm(Instant.now());
        repositorio.save(concluida);
    }

    private Tarefa criar(String titulo, String descricao, Prioridade prioridade, LocalDate prazo) {
        Tarefa tarefa = new Tarefa();
        tarefa.setTitulo(titulo);
        tarefa.setDescricao(descricao);
        tarefa.setPrioridade(prioridade);
        tarefa.setPrazo(prazo);
        return tarefa;
    }
}
