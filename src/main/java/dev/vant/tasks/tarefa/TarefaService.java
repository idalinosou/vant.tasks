package dev.vant.tasks.tarefa;

import dev.vant.tasks.erro.RecursoNaoEncontradoException;
import dev.vant.tasks.erro.RegraDeNegocioException;
import dev.vant.tasks.tarefa.dto.TarefaRequest;
import dev.vant.tasks.tarefa.dto.TarefaResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class TarefaService {

    private final TarefaRepository repositorio;

    public TarefaService(TarefaRepository repositorio) {
        this.repositorio = repositorio;
    }

    @Transactional
    public TarefaResponse criar(TarefaRequest pedido) {
        Tarefa tarefa = new Tarefa();
        aplicarDados(tarefa, pedido);
        return TarefaResponse.de(repositorio.save(tarefa));
    }

    @Transactional(readOnly = true)
    public TarefaResponse buscar(Long id) {
        return TarefaResponse.de(porId(id));
    }

    @Transactional(readOnly = true)
    public Page<TarefaResponse> listar(StatusTarefa status, Prioridade prioridade, Pageable paginacao) {
        Specification<Tarefa> filtro = (root, query, builder) -> builder.conjunction();

        if (status != null) {
            filtro = filtro.and((root, query, builder) -> builder.equal(root.get("status"), status));
        }
        if (prioridade != null) {
            filtro = filtro.and((root, query, builder) -> builder.equal(root.get("prioridade"), prioridade));
        }

        return repositorio.findAll(filtro, paginacao).map(TarefaResponse::de);
    }

    @Transactional
    public TarefaResponse atualizar(Long id, TarefaRequest pedido) {
        Tarefa tarefa = porId(id);
        if (tarefa.getStatus() == StatusTarefa.CONCLUIDA) {
            throw new RegraDeNegocioException("Uma tarefa concluída não pode ser editada.");
        }
        aplicarDados(tarefa, pedido);
        return TarefaResponse.de(tarefa);
    }

    @Transactional
    public TarefaResponse iniciar(Long id) {
        Tarefa tarefa = porId(id);
        if (tarefa.getStatus() == StatusTarefa.CONCLUIDA) {
            throw new RegraDeNegocioException("Uma tarefa concluída não pode ser reiniciada.");
        }
        tarefa.setStatus(StatusTarefa.EM_ANDAMENTO);
        return TarefaResponse.de(tarefa);
    }

    @Transactional
    public TarefaResponse concluir(Long id) {
        Tarefa tarefa = porId(id);
        if (tarefa.getStatus() != StatusTarefa.CONCLUIDA) {
            tarefa.setStatus(StatusTarefa.CONCLUIDA);
            tarefa.setConcluidaEm(Instant.now());
        }
        return TarefaResponse.de(tarefa);
    }

    @Transactional
    public void excluir(Long id) {
        Tarefa tarefa = porId(id);
        repositorio.delete(tarefa);
    }

    private Tarefa porId(Long id) {
        return repositorio.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Tarefa " + id + " não encontrada."));
    }

    private void aplicarDados(Tarefa tarefa, TarefaRequest pedido) {
        tarefa.setTitulo(pedido.titulo().trim());
        tarefa.setDescricao(pedido.descricao());
        tarefa.setPrioridade(pedido.prioridade() == null ? Prioridade.MEDIA : pedido.prioridade());
        tarefa.setPrazo(pedido.prazo());
    }
}
